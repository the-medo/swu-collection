import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.ts';
import { user } from '../../db/schema/auth-schema.ts';
import { creatorChannelResolution, creatorVideoJob } from '../../db/schema/creator_video_job.ts';
import {
  creation,
  creatorChannel,
  creatorOauthState,
  creatorProfile,
  creatorYoutube,
  creatorYoutubeChannel,
} from '../../db/schema/creator_hub.ts';
import { creatorProfileSchema, safeUrl } from '../../../shared/creators/contracts.ts';
import type {
  YoutubeCallbackResult,
  YoutubeClaimChoice,
  YoutubeClaimPreview,
  YoutubeConnectionResult,
} from '../../../shared/creators/claims.ts';
import { emptyPostDocument } from '../../../shared/posts/content.ts';
import { directoryChannelIds, directoryHandle } from './channels.ts';
import { CreatorError } from './errors.ts';
import { requireCreator } from './permissions.ts';
import { assertCreatorProfileAllowed } from './moderation.ts';
import { transferCreatorDecks } from './claim-decks.ts';
import { now, type Database, type Transaction } from './types.ts';
import {
  exchangeYoutubeToken,
  seal,
  unseal,
  youtubeConfig,
  youtubeScope,
} from './youtube-credentials.ts';

export const stateHash = (value: string) => createHash('sha256').update(value).digest('hex');
export class YoutubeOwnershipError extends CreatorError {
  constructor(
    message: string,
    public reason: 'already_claimed' | 'channel_mismatch',
  ) {
    super(message, 409);
  }
}
const expiresAt = () => new Date(Date.now() + 10 * 60_000).toISOString();
const verifiedConnectionSchema = z.object({
  channel: z.object({
    id: z.string().regex(/^UC[\w-]{22}$/),
    title: z.string().min(1).max(100),
    avatarUrl: z.union([safeUrl, z.literal('')]),
    handle: z.string().optional(),
  }),
  accessToken: z.string().min(1),
  refreshToken: z.string().nullable(),
  tokenExpiresAt: z.iso.datetime(),
  verifiedAt: z.iso.datetime(),
});
type VerifiedConnection = z.infer<typeof verifiedConnectionSchema>;
const channelsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().regex(/^UC[\w-]{22}$/),
      snippet: z.object({
        title: z.string().min(1),
        customUrl: z.string().optional(),
        thumbnails: z.record(z.string(), z.object({ url: z.string() })).optional(),
      }),
    }),
  ),
});

async function verifiedConnection(code: string, verifier: string): Promise<VerifiedConnection> {
  const token = await exchangeYoutubeToken({
    grant_type: 'authorization_code',
    code,
    code_verifier: unseal(verifier),
    redirect_uri: youtubeConfig().redirectUri,
  });
  let payload: unknown;
  try {
    const response = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      {
        headers: { Authorization: `Bearer ${token.access_token}` },
        signal: AbortSignal.timeout(15_000),
        redirect: 'error',
      },
    );
    if (!response.ok) throw new Error('channel_request_failed');
    payload = await response.json();
  } catch {
    throw new CreatorError('YouTube could not verify this channel. Please try again.', 503);
  }
  const channels = channelsSchema.safeParse(payload);
  if (!channels.success || channels.data.items.length !== 1)
    throw new CreatorError('Choose a YouTube channel account and connect again.');
  const channel = channels.data.items[0];
  const image = channel.snippet.thumbnails?.high?.url ?? channel.snippet.thumbnails?.default?.url;
  return {
    channel: {
      id: channel.id,
      title: channel.snippet.title.slice(0, 100),
      avatarUrl: safeUrl.safeParse(image).success ? image! : '',
      handle: channel.snippet.customUrl?.replace(/^@/, '').toLowerCase(),
    },
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? null,
    tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000).toISOString(),
    verifiedAt: now(),
  };
}

const ownedProfiles = (database: Database | Transaction, userId: string) =>
  database.select().from(creatorProfile).where(eq(creatorProfile.ownerId, userId));

/** Only authenticated Google channel identity can select an existing directory profile. */
async function matchingProfiles(tx: Transaction, channel: VerifiedConnection['channel']) {
  const linked = await tx
    .select({ profile: creatorProfile, origin: creatorChannel.origin })
    .from(creatorChannel)
    .innerJoin(creatorProfile, eq(creatorProfile.id, creatorChannel.creatorId))
    .where(
      and(
        eq(creatorChannel.channelId, channel.id),
        or(
          inArray(creatorChannel.origin, ['oauth', 'public']),
          and(
            isNull(creatorProfile.ownerId),
            or(
              isNull(creatorChannel.sourceUrl),
              sql`EXISTS (
              SELECT 1 FROM jsonb_array_elements(${creatorProfile.profile}->'links') AS link
              WHERE link->>'url' = ${creatorChannel.sourceUrl}
            )`,
            ),
          ),
        ),
      ),
    );
  // An existing OAuth/public import association wins over directory-only entries,
  // so an owner can reconnect after revocation without changing profile identity.
  const authoritative = linked.filter(row => ['oauth', 'public'].includes(row.origin));
  if (authoritative.length) return authoritative.map(row => row.profile);
  // Resolve directory links against the current authenticated identity. A cached handle
  // resolution alone is not ownership proof: YouTube handles can change hands.
  const directory = await tx.select().from(creatorProfile).where(isNull(creatorProfile.ownerId));
  const resolutions = channel.handle ? await tx.select().from(creatorChannelResolution) : [];
  const associations = channel.handle
    ? await tx.select().from(creatorChannel).where(eq(creatorChannel.origin, 'curated'))
    : [];
  const handleMatches = (profile: typeof creatorProfile.$inferSelect) =>
    profile.profile.links.some(link => {
      const handle = directoryHandle(link.url)?.handle.toLowerCase();
      if (!channel.handle || handle !== channel.handle) return false;
      const known = [
        ...resolutions.filter(row => directoryHandle(row.url)?.handle.toLowerCase() === handle),
        ...associations.filter(
          row =>
            row.creatorId === profile.id &&
            row.sourceUrl &&
            directoryHandle(row.sourceUrl)?.handle.toLowerCase() === handle,
        ),
      ];
      return known.every(row => row.channelId === channel.id);
    });
  return [
    ...new Map(
      [
        ...linked.map(row => row.profile),
        ...directory.filter(
          profile =>
            directoryChannelIds(profile.profile.links).includes(channel.id) ||
            handleMatches(profile),
        ),
      ].map(profile => [profile.id, profile]),
    ).values(),
  ];
}

async function saveConnection(tx: Transaction, creatorId: string, connection: VerifiedConnection) {
  const { channel } = connection;
  const [existing] = await tx
    .select()
    .from(creatorYoutube)
    .where(eq(creatorYoutube.channelId, channel.id));
  if (existing && existing.creatorId !== creatorId)
    throw new CreatorError('This channel is already linked to another creator.', 409);
  const metadata = {
    title: channel.title,
    avatarUrl: channel.avatarUrl,
    metadataUpdatedAt: connection.verifiedAt,
    metadataCheckedAt: null,
    metadataOrigin: 'oauth' as const,
  };
  await tx
    .insert(creatorYoutubeChannel)
    .values({ channelId: channel.id, ...metadata })
    .onConflictDoUpdate({ target: creatorYoutubeChannel.channelId, set: metadata });
  await tx
    .insert(creatorChannel)
    .values({ creatorId, channelId: channel.id, origin: 'oauth' })
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
  const values = {
    creatorId,
    connectedAt: now(),
    checkedAt: connection.verifiedAt,
    lastCheckAttemptAt: connection.verifiedAt,
    accessToken: seal(connection.accessToken),
    refreshToken: connection.refreshToken
      ? seal(connection.refreshToken)
      : (existing?.refreshToken ?? null),
    expiresAt: connection.tokenExpiresAt,
  };
  await tx
    .insert(creatorYoutube)
    .values({ channelId: channel.id, ...values })
    .onConflictDoUpdate({ target: creatorYoutube.channelId, set: values });
  await tx
    .update(creation)
    .set({ sourceStatus: 'expired', sourceCheckedAt: null })
    .where(
      and(
        eq(creation.creatorId, creatorId),
        eq(creation.sourceStatus, 'authorization_removed'),
        or(eq(creation.sourceChannelId, channel.id), isNull(creation.sourceChannelId)),
      ),
    );
}

async function finishConnection(
  tx: Transaction,
  viewerId: string,
  connection: VerifiedConnection,
  target: {
    creatorId?: string | null;
    purpose: 'connect' | 'claim' | 'confirm';
    choice?: YoutubeClaimChoice;
  },
): Promise<YoutubeConnectionResult | null> {
  await tx.select({ id: user.id }).from(user).where(eq(user.id, viewerId)).for('no key update');
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${`creator-youtube:${connection.channel.id}`}, 0))`,
  );
  const matches = await matchingProfiles(tx, connection.channel);
  if (matches.length > 1)
    throw new CreatorError(
      'This channel matches more than one creator profile. Contact SWUBASE support.',
      409,
    );
  if (target.purpose === 'claim' && target.creatorId && matches[0]?.id !== target.creatorId)
    throw new YoutubeOwnershipError(
      'Choose a YouTube channel belonging to the creator profile you want to claim.',
      'channel_mismatch',
    );
  const chosenProfile =
    target.purpose === 'connect'
      ? target.creatorId
      : target.choice?.action === 'connect'
        ? target.choice.creatorId
        : undefined;
  if (
    matches[0] &&
    ((chosenProfile && matches[0].id !== chosenProfile) || target.choice?.action === 'create')
  )
    throw new YoutubeOwnershipError(
      'This channel already has another creator profile. Connect YouTube from that profile to claim or manage it.',
      'channel_mismatch',
    );
  let profile = matches[0];
  if (profile) {
    [profile] = await tx
      .select()
      .from(creatorProfile)
      .where(eq(creatorProfile.id, profile.id))
      .for('update');
    if (!profile) throw new CreatorError('Creator not found.', 404);
    if (!(await matchingProfiles(tx, connection.channel)).some(match => match.id === profile.id))
      throw new CreatorError('This creator profile changed. Connect again.', 409);
    if (profile.ownerId && profile.ownerId !== viewerId)
      throw new YoutubeOwnershipError(
        'This creator profile has already been claimed by another user.',
        'already_claimed',
      );
  } else if (target.purpose === 'connect' && target.creatorId) {
    profile = await requireCreator(tx, target.creatorId, viewerId, true, true);
  } else if (target.choice?.action === 'connect') {
    profile = await requireCreator(tx, target.choice.creatorId, viewerId, true, true);
  } else {
    // Serialize simultaneous onboarding confirmations without blocking FK key-share locks.
    const owned = await ownedProfiles(tx, viewerId);
    if (target.choice?.action === 'create') {
      if (owned.length)
        throw new CreatorError(
          'You already have a creator profile. Reload and select the profile to connect.',
          409,
        );
      const input = creatorProfileSchema.parse({
        name: target.choice.name,
        slug: target.choice.slug,
        bio: emptyPostDocument(),
        languages: ['en'],
        specialties: [],
        avatarUrl: connection.channel.avatarUrl,
        links: [
          {
            label: 'YouTube',
            url: `https://www.youtube.com/channel/${connection.channel.id}`,
            kind: 'social',
          },
        ],
      });
      assertCreatorProfileAllowed(input);
      [profile] = await tx
        .insert(creatorProfile)
        .values({ ownerId: viewerId, slug: input.slug, profile: input })
        .returning();
    } else if (owned.length === 1) {
      profile = await requireCreator(tx, owned[0].id, viewerId, true, true);
    } else {
      return null;
    }
  }
  const claimed = !profile.ownerId;
  let transferredDecks = 0;
  if (claimed) {
    // Keep the queue from starting another job with the old owner while this
    // transaction commits. Profile locking also blocks new jobs' FK insertion.
    await tx
      .select({ id: creatorVideoJob.videoId })
      .from(creatorVideoJob)
      .where(eq(creatorVideoJob.creatorId, profile.id))
      .orderBy(creatorVideoJob.videoId)
      .for('update');
    await tx
      .update(creatorProfile)
      .set({ ownerId: viewerId, revision: sql`${creatorProfile.revision} + 1`, updatedAt: now() })
      .where(and(eq(creatorProfile.id, profile.id), isNull(creatorProfile.ownerId)));
    transferredDecks = await transferCreatorDecks(tx, profile.id, viewerId);
    // Fence work begun under the system owner; the next run keeps its cached analysis
    // and resolves deck ownership again before it can publish.
    await tx
      .update(creatorVideoJob)
      .set({
        status: 'pending',
        claimId: null,
        leaseUntil: null,
        lastError: null,
        attempts: sql`greatest(0, ${creatorVideoJob.attempts} - 1)`,
        availableAt: now(),
        updatedAt: now(),
      })
      .where(
        and(eq(creatorVideoJob.creatorId, profile.id), eq(creatorVideoJob.status, 'processing')),
      );
    // Preserve public imports from the other curated channels belonging to the claimed profile.
    await tx
      .update(creatorChannel)
      .set({ origin: 'public' })
      .where(and(eq(creatorChannel.creatorId, profile.id), eq(creatorChannel.origin, 'curated')));
  }
  await saveConnection(tx, profile.id, connection);
  return { creatorId: profile.id, channelId: connection.channel.id, claimed, transferredDecks };
}

export function createYoutubeOwnershipService(database: Database = db) {
  async function start(
    viewerId: string,
    sessionId: string,
    purpose: 'connect' | 'claim',
    creatorId?: string,
  ) {
    const config = youtubeConfig();
    const state = randomBytes(32).toString('base64url');
    const verifier = randomBytes(48).toString('base64url');
    await database.transaction(async tx => {
      await tx.select({ id: user.id }).from(user).where(eq(user.id, viewerId)).for('no key update');
      if (purpose === 'connect') await requireCreator(tx, creatorId!, viewerId, true, true);
      else if (creatorId) {
        const [profile] = await tx
          .select()
          .from(creatorProfile)
          .where(eq(creatorProfile.id, creatorId));
        if (!profile) throw new CreatorError('Creator not found.', 404);
        if (profile.ownerId && profile.ownerId !== viewerId)
          throw new CreatorError(
            'This creator profile has already been claimed by another user.',
            409,
          );
      }
      await tx.delete(creatorOauthState).where(lt(creatorOauthState.expiresAt, now()));
      await tx
        .delete(creatorOauthState)
        .where(
          and(eq(creatorOauthState.userId, viewerId), eq(creatorOauthState.sessionId, sessionId)),
        );
      await tx.insert(creatorOauthState).values({
        hash: stateHash(state),
        creatorId: creatorId ?? null,
        userId: viewerId,
        sessionId,
        verifier: seal(verifier),
        purpose,
        expiresAt: expiresAt(),
      });
    });
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: youtubeScope,
      state,
      access_type: 'offline',
      prompt: 'consent',
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    });
    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` };
  }
  const pendingFilter = (viewerId: string, sessionId: string, claimId: string) =>
    and(
      eq(creatorOauthState.hash, stateHash(claimId)),
      eq(creatorOauthState.userId, viewerId),
      eq(creatorOauthState.sessionId, sessionId),
      eq(creatorOauthState.purpose, 'confirm'),
      gt(creatorOauthState.expiresAt, now()),
    );
  return {
    connect: (creatorId: string, viewerId: string, sessionId: string) =>
      start(viewerId, sessionId, 'connect', creatorId),
    claim: (viewerId: string, sessionId: string, creatorId?: string) =>
      start(viewerId, sessionId, 'claim', creatorId),
    async callback(
      viewerId: string,
      sessionId: string,
      state: string,
      code: string,
    ): Promise<YoutubeCallbackResult> {
      const [pending] = await database
        .delete(creatorOauthState)
        .where(
          and(
            eq(creatorOauthState.hash, stateHash(state)),
            eq(creatorOauthState.userId, viewerId),
            eq(creatorOauthState.sessionId, sessionId),
            gt(creatorOauthState.expiresAt, now()),
            inArray(creatorOauthState.purpose, ['connect', 'claim']),
          ),
        )
        .returning();
      if (!pending) throw new CreatorError('This YouTube connection expired. Start again.', 400);
      if (pending.purpose === 'connect')
        await requireCreator(database, pending.creatorId!, viewerId, true);
      const connection = await verifiedConnection(code, pending.verifier);
      return database.transaction(async tx => {
        const result = await finishConnection(tx, viewerId, connection, {
          creatorId: pending.creatorId,
          purpose: pending.purpose as 'connect' | 'claim',
        });
        if (result) return result;
        const claimId = randomBytes(32).toString('base64url');
        await tx.insert(creatorOauthState).values({
          hash: stateHash(claimId),
          creatorId: null,
          userId: viewerId,
          sessionId,
          verifier: '',
          purpose: 'confirm',
          pendingConnection: seal(JSON.stringify(connection)),
          expiresAt: expiresAt(),
        });
        return { claimId };
      });
    },
    async pendingClaim(
      viewerId: string,
      sessionId: string,
      claimId: string,
    ): Promise<YoutubeClaimPreview> {
      const [pending] = await database
        .select()
        .from(creatorOauthState)
        .where(pendingFilter(viewerId, sessionId, claimId));
      if (!pending?.pendingConnection)
        throw new CreatorError('This YouTube connection expired. Connect again.', 404);
      const { channel } = verifiedConnectionSchema.parse(
        JSON.parse(unseal(pending.pendingConnection)),
      );
      const base = channel.title
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 48)
        .replace(/-$/, '');
      const suggestedSlug = `${base || 'creator'}-${
        channel.id
          .slice(-6)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '') || 'youtube'
      }`;
      return {
        channel: { id: channel.id, title: channel.title, avatarUrl: channel.avatarUrl },
        suggestedSlug,
        profiles: (await ownedProfiles(database, viewerId)).map(p => ({
          id: p.id,
          name: p.profile.name,
        })),
        expiresAt: pending.expiresAt,
      };
    },
    async confirmClaim(
      viewerId: string,
      sessionId: string,
      claimId: string,
      choice: YoutubeClaimChoice,
    ) {
      try {
        return await database.transaction(async tx => {
          // Match start/finish's user-before-state/profile lock order.
          await tx
            .select({ id: user.id })
            .from(user)
            .where(eq(user.id, viewerId))
            .for('no key update');
          const [pending] = await tx
            .select()
            .from(creatorOauthState)
            .where(pendingFilter(viewerId, sessionId, claimId))
            .for('update');
          if (!pending?.pendingConnection)
            throw new CreatorError('This YouTube connection expired. Connect again.', 404);
          const connection = verifiedConnectionSchema.parse(
            JSON.parse(unseal(pending.pendingConnection)),
          );
          const result = await finishConnection(tx, viewerId, connection, {
            purpose: 'confirm',
            choice,
          });
          if (!result) throw new CreatorError('Choose a creator profile to continue.');
          await tx.delete(creatorOauthState).where(eq(creatorOauthState.hash, pending.hash));
          return result;
        });
      } catch (error) {
        if ((error as { cause?: { code?: string } }).cause?.code === '23505')
          throw new CreatorError(
            'That profile address is already taken. Choose another address.',
            409,
          );
        throw error;
      }
    },
    async cancelClaim(viewerId: string, sessionId: string, claimId: string) {
      await database.delete(creatorOauthState).where(pendingFilter(viewerId, sessionId, claimId));
    },
  };
}
