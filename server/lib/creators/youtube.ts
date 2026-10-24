import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  creation,
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
import { youtubeConfig } from './youtube-credentials.ts';
import { createYoutubeOwnershipService } from './youtube-ownership.ts';
export { stateHash } from './youtube-ownership.ts';
export { youtubeConfig, seal, unseal } from './youtube-credentials.ts';
import { disconnectYoutubeInTransaction } from './metadata-lifecycle.ts';
import { youtubeClient } from './worker/providers.ts';
import { refreshYoutubeAccess } from './youtube-access.ts';

const creatorService = createCreationsService(db);
export const youtubeService = {
  ...createYoutubeOwnershipService(),
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
