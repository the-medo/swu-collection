import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, lt, inArray, sql, or, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.ts';
import {
  creation,
  creatorOauthState,
  creatorYoutube,
  creatorYoutubeChannel,
  creatorChannel,
} from '../../db/schema/creator_hub.ts';
import { CreatorError } from './errors.ts';
import { requireCreator } from './permissions.ts';
import { createCreationsService } from './creations.ts';
import { youtubeVideoId } from '../../../shared/creators/youtube.ts';
import { documentFromVideo } from './video.ts';
import type { CreatorYoutubeStatus } from '../../../shared/creators/contracts.ts';
import { channelFetchingConfigured } from './channel-imports.ts';
import {
  youtubeConfig,
  youtubeScope,
  seal,
  unseal,
  exchangeYoutubeToken,
} from './youtube-credentials.ts';
export { youtubeConfig, seal, unseal } from './youtube-credentials.ts';
import { disconnectYoutubeInTransaction } from './metadata-lifecycle.ts';
import { youtubeClient } from './worker/providers.ts';
import { refreshYoutubeAccess } from './youtube-access.ts';

const creatorService = createCreationsService(db);
const scope = youtubeScope;
export const stateHash = (value: string) => createHash('sha256').update(value).digest('hex');
const channelsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().regex(/^UC[\w-]{22}$/),
      snippet: z.object({
        title: z.string(),
        thumbnails: z.record(z.string(), z.object({ url: z.string() })).optional(),
      }),
    }),
  ),
});
async function request(url: string, init?: RequestInit) {
  try {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(15_000),
      redirect: 'error',
    });
    if (!response.ok) throw new Error('Provider request failed');
    return await response.json();
  } catch {
    throw new CreatorError(
      'YouTube could not complete this request. Check the connection and try again.',
      503,
    );
  }
}
export const youtubeService = {
  async status(creatorId: string, viewerId: string): Promise<CreatorYoutubeStatus> {
    await requireCreator(db, creatorId, viewerId, true);
    let configured = true;
    try {
      youtubeConfig();
    } catch {
      configured = false;
    }
    const channels = await db
      .select({
        channelId: creatorChannel.channelId,
        connected: sql<boolean>`${creatorYoutube.channelId} IS NOT NULL`,
        disconnectedAt: creatorChannel.disconnectedAt,
        disconnectReason: creatorChannel.disconnectReason,
        title: creatorYoutubeChannel.title,
        avatarUrl: creatorYoutubeChannel.avatarUrl,
        connectedAt: creatorYoutube.connectedAt,
        autoImportEnabled: creatorYoutubeChannel.autoImportEnabled,
        lastManualFetchAt: creatorYoutubeChannel.lastManualFetchAt,
      })
      .from(creatorChannel)
      .leftJoin(
        creatorYoutube,
        and(
          eq(creatorYoutube.channelId, creatorChannel.channelId),
          eq(creatorYoutube.creatorId, creatorChannel.creatorId),
        ),
      )
      .innerJoin(
        creatorYoutubeChannel,
        eq(creatorYoutubeChannel.channelId, creatorChannel.channelId),
      )
      .where(
        and(
          eq(creatorChannel.creatorId, creatorId),
          inArray(creatorChannel.origin, ['oauth', 'public']),
        ),
      );
    return { configured, fetchingConfigured: channelFetchingConfigured(), channels };
  },
  async connect(creatorId: string, viewerId: string, sessionId: string) {
    const config = youtubeConfig(),
      state = randomBytes(32).toString('base64url'),
      verifier = randomBytes(48).toString('base64url');
    await db.transaction(async tx => {
      await requireCreator(tx, creatorId, viewerId, true, true);
      await tx
        .delete(creatorOauthState)
        .where(lt(creatorOauthState.expiresAt, new Date().toISOString()));
      await tx
        .delete(creatorOauthState)
        .where(
          and(eq(creatorOauthState.userId, viewerId), eq(creatorOauthState.creatorId, creatorId)),
        );
      await tx.insert(creatorOauthState).values({
        hash: stateHash(state),
        creatorId,
        userId: viewerId,
        sessionId,
        verifier: seal(verifier),
        expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
      });
    });
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope,
      state,
      access_type: 'offline',
      prompt: 'consent',
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    });
    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` };
  },
  async callback(viewerId: string, sessionId: string, state: string, code: string) {
    // Consume only a state bound to this exact signed-in session. A replay cannot exchange a code.
    const [pending] = await db
      .delete(creatorOauthState)
      .where(
        and(
          eq(creatorOauthState.hash, stateHash(state)),
          eq(creatorOauthState.userId, viewerId),
          eq(creatorOauthState.sessionId, sessionId),
          gt(creatorOauthState.expiresAt, new Date().toISOString()),
        ),
      )
      .returning();
    if (!pending) throw new CreatorError('This YouTube connection expired. Start again.', 400);
    await requireCreator(db, pending.creatorId, viewerId, true);
    const token = await exchangeYoutubeToken({
      grant_type: 'authorization_code',
      code,
      code_verifier: unseal(pending.verifier),
      redirect_uri: youtubeConfig().redirectUri,
    });
    const channels = channelsSchema.safeParse(
      await request('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
        headers: { Authorization: `Bearer ${token.access_token}` },
      }),
    );
    if (!channels.success || channels.data.items.length !== 1)
      throw new CreatorError('Choose a YouTube channel account and connect again.');
    const channel = channels.data.items[0];
    await db.transaction(async tx => {
      await requireCreator(tx, pending.creatorId, viewerId, true, true);
      // Lock the channel identity across creator profiles as well as within one profile.
      await tx.execute(sqlChannelLock(channel.id));
      const [existing] = await tx
        .select()
        .from(creatorYoutube)
        .where(eq(creatorYoutube.channelId, channel.id));
      if (existing && existing.creatorId !== pending.creatorId)
        throw new CreatorError('This channel is already linked to another creator.', 409);
      const [association] = await tx
        .select()
        .from(creatorChannel)
        .where(
          and(
            eq(creatorChannel.channelId, channel.id),
            inArray(creatorChannel.origin, ['oauth', 'public']),
          ),
        );
      if (association && association.creatorId !== pending.creatorId)
        throw new CreatorError('This channel is already linked to another creator.', 409);
      const values = {
        creatorId: pending.creatorId,
        connectedAt: new Date().toISOString(),
        checkedAt: new Date().toISOString(),
        lastCheckAttemptAt: new Date().toISOString(),
        accessToken: seal(token.access_token),
        refreshToken: token.refresh_token
          ? seal(token.refresh_token)
          : (existing?.refreshToken ?? null),
        expiresAt: new Date(Date.now() + token.expires_in * 1000).toISOString(),
      };
      const metadata = {
        title: channel.snippet.title,
        avatarUrl:
          channel.snippet.thumbnails?.high?.url ?? channel.snippet.thumbnails?.default?.url ?? '',
        metadataUpdatedAt: new Date().toISOString(),
        metadataCheckedAt: null,
        metadataOrigin: 'oauth' as const,
      };
      await tx
        .insert(creatorYoutubeChannel)
        .values({ channelId: channel.id, ...metadata })
        .onConflictDoUpdate({ target: creatorYoutubeChannel.channelId, set: metadata });
      await tx
        .insert(creatorChannel)
        .values({ creatorId: pending.creatorId, channelId: channel.id, origin: 'oauth' })
        .onConflictDoUpdate({
          target: [creatorChannel.creatorId, creatorChannel.channelId],
          set: {
            origin: 'oauth',
            sourceUrl: null,
            resolvedAt: null,
            disconnectedAt: null,
            disconnectReason: null,
          },
        });
      await tx
        .insert(creatorYoutube)
        .values({ channelId: channel.id, ...values })
        .onConflictDoUpdate({ target: creatorYoutube.channelId, set: values });
      // Explicitly reconnecting permits fresh public metadata to restore removed drafts.
      // Maintenance never republishes them automatically.
      await tx
        .update(creation)
        .set({ sourceStatus: 'expired', sourceCheckedAt: null })
        .where(
          and(
            eq(creation.creatorId, pending.creatorId),
            eq(creation.sourceStatus, 'authorization_removed'),
            or(eq(creation.sourceChannelId, channel.id), isNull(creation.sourceChannelId)),
          ),
        );
    });
    return { creatorId: pending.creatorId, channelId: channel.id };
  },
  async disconnect(creatorId: string, viewerId: string, channelId: string) {
    await db.transaction(async tx => {
      await requireCreator(tx, creatorId, viewerId, true, true);
      await disconnectYoutubeInTransaction(
        tx,
        creatorId,
        channelId,
        'disconnected',
        new Date().toISOString(),
      );
    });
  },
  async importVideo(creatorId: string, viewerId: string, channelId: string, source: string) {
    const videoId = youtubeVideoId(source);
    if (!videoId) throw new CreatorError('Enter a valid YouTube video URL or ID.');
    const profile = await requireCreator(db, creatorId, viewerId, true);
    const [channel] = await db
      .select()
      .from(creatorYoutube)
      .where(and(eq(creatorYoutube.creatorId, creatorId), eq(creatorYoutube.channelId, channelId)));
    if (!channel) throw new CreatorError('Connect this channel first.', 403);
    if (Date.parse(channel.expiresAt) <= Date.now() + 60_000) {
      if (!(await refreshYoutubeAccess(db, channel)))
        throw new CreatorError('This connection changed. Please try again.', 409);
    }
    const [existing] = await db
      .select({ id: creation.id, creatorId: creation.creatorId })
      .from(creation)
      .where(eq(creation.sourceVideoId, videoId));
    if (existing) {
      if (existing.creatorId !== creatorId)
        throw new CreatorError('This video was already imported.', 409);
      return { id: existing.id };
    }
    // Account authorization verifies ownership; imported content uses public API data.
    let video: Awaited<ReturnType<ReturnType<typeof youtubeClient>['video']>>;
    try {
      video = await youtubeClient(process.env.YOUTUBE_API_KEY ?? '').video(videoId);
    } catch {
      throw new CreatorError(
        'YouTube could not load this video. It may not be ready yet, or the service may be temporarily unavailable. Please try again later.',
        503,
      );
    }
    if (!video || video.channelId !== channelId)
      throw new CreatorError('Only public, embeddable videos from this channel can be imported.');
    const document = documentFromVideo(video, { fallbackLanguage: profile.profile.languages[0] });
    try {
      return await creatorService.save(
        creatorId,
        viewerId,
        document,
        undefined,
        undefined,
        videoId,
        channelId,
        'public',
      );
    } catch (error) {
      if ((error as { cause?: { code?: string } }).cause?.code === '23505')
        throw new CreatorError('This video was already imported. Refresh your studio.', 409);
      throw error;
    }
  },
};
function sqlChannelLock(id: string) {
  return sql`SELECT pg_advisory_xact_lock(hashtextextended(${`creator-youtube:${id}`}, 0))`;
}
