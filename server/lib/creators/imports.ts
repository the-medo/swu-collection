import { createHash } from 'node:crypto';
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  creatorProfile,
  creatorChannel,
  creatorYoutubeChannel,
  creation,
} from '../../db/schema/creator_hub.ts';
import { creatorVideoJob, creatorChannelResolution } from '../../db/schema/creator_video_job.ts';
import { creatorProfileSchema } from '../../../shared/creators/contracts.ts';
import {
  creatorImportSchema,
  type CreatorImport,
  type CreatorImportPreview,
  type CreatorImportRow,
  type ImportedCreator,
} from '../../../shared/creators/imports.ts';
import { directoryChannelIds } from '../../../shared/creators/youtube.ts';
import { directoryHandle, eligibleChannels } from './channels.ts';
import { CreatorError } from './errors.ts';
import { assertCreatorProfileAllowed } from './moderation.ts';
import type { Connection, Database } from './types.ts';

function profileDocument(input: ImportedCreator) {
  return creatorProfileSchema.parse({
    ...input,
    bio: {
      version: 1,
      blocks: [
        {
          id: 'imported-bio',
          type: 'paragraph',
          props: {},
          children: [],
          content: input.bio ? [{ type: 'text', text: input.bio, styles: {} }] : [],
        },
      ],
    },
  });
}

async function planImport(database: Connection, input: CreatorImport) {
  const [profiles, associations, eligible, pausedChannels, resolutions] = await Promise.all([
    database
      .select({
        id: creatorProfile.id,
        slug: creatorProfile.slug,
        ownerId: creatorProfile.ownerId,
        links: sql<ImportedCreator['links']>`${creatorProfile.profile}->'links'`,
      })
      .from(creatorProfile),
    database.select().from(creatorChannel),
    eligibleChannels(database),
    database
      .select({ id: creatorYoutubeChannel.channelId })
      .from(creatorYoutubeChannel)
      .where(eq(creatorYoutubeChannel.autoImportEnabled, false)),
    database
      .select({ url: creatorChannelResolution.url, channelId: creatorChannelResolution.channelId })
      .from(creatorChannelResolution),
  ]);
  const bySlug = new Map(profiles.map(p => [p.slug, p]));
  const byId = new Map(profiles.map(p => [p.id, p]));
  const paused = new Set(pausedChannels.map(c => c.id));
  const profileChannels = new Map(
    profiles.map(p => [p.id, new Set(p.ownerId === null ? directoryChannelIds(p.links) : [])]),
  );
  const resolvedHandles = new Map(resolutions.map(r => [r.url, r.channelId]));
  // Staff-edited handle links can already be resolved before the next association sync.
  for (const profile of profiles.filter(p => p.ownerId === null))
    for (const link of profile.links) {
      const handle = directoryHandle(link.url);
      const channel = handle && resolvedHandles.get(handle.url);
      if (channel) profileChannels.get(profile.id)!.add(channel);
    }
  for (const association of associations)
    profileChannels.get(association.creatorId)?.add(association.channelId);
  const owners = new Map<string, Set<string>>();
  for (const [id, channels] of profileChannels)
    for (const channel of channels) {
      if (!owners.has(channel)) owners.set(channel, new Set());
      owners.get(channel)!.add(id);
    }
  const creators: CreatorImportRow[] = [];
  const additions = new Map<string, string>();
  for (const profile of input.creators) {
    const document = profileDocument(profile);
    assertCreatorProfileAllowed(document);
    const existing = bySlug.get(profile.slug);
    const channels = directoryChannelIds(profile.links);
    const elsewhere = channels.some(channel =>
      [...(owners.get(channel) ?? [])].some(id => id !== existing?.id),
    );
    let status: CreatorImportRow['status'] = 'insert';
    let reason = 'Create an unowned directory profile.';
    if (elsewhere) {
      status = 'conflict';
      reason = 'A YouTube channel already belongs to another creator profile.';
    } else if (existing) {
      if (channels.every(channel => profileChannels.get(existing.id)?.has(channel))) {
        status = 'skip';
        reason = 'Already exists; its profile and ownership will be preserved.';
      } else {
        status = 'conflict';
        reason =
          'This address exists with different channels. Existing profiles cannot be changed by an import.';
      }
    } else {
      for (const channel of channels) additions.set(channel, profile.slug);
    }
    creators.push({ key: profile.slug, label: profile.name, status, reason });
  }
  const ids = input.videos.map(v => v.videoId);
  const [jobs, publications] = ids.length
    ? await Promise.all([
        database
          .select({ id: creatorVideoJob.videoId })
          .from(creatorVideoJob)
          .where(inArray(creatorVideoJob.videoId, ids)),
        database
          .select({ id: creation.sourceVideoId })
          .from(creation)
          .where(inArray(creation.sourceVideoId, ids)),
      ])
    : [[], []];
  const existingVideos = new Set([...jobs, ...publications].map(v => v.id));
  const targets = new Map<string, { id?: string; slug: string }>();
  for (const video of input.videos) {
    const newSlug = additions.get(video.channelId);
    const existingId = eligible.channels.get(video.channelId);
    if (newSlug) targets.set(video.channelId, { slug: newSlug });
    else if (existingId)
      targets.set(video.channelId, {
        id: existingId,
        slug: byId.get(existingId)!.slug,
      });
  }
  const videos: CreatorImportRow[] = input.videos.map(video => {
    const target = targets.get(video.channelId);
    if (existingVideos.has(video.videoId))
      return {
        key: video.videoId,
        label: video.videoId,
        status: 'skip',
        reason: 'Already queued or imported; existing content will be preserved.',
      };
    if (paused.has(video.channelId))
      return {
        key: video.videoId,
        label: video.videoId,
        status: 'skip',
        reason: 'Auto-import is paused for this channel.',
      };
    if (!target)
      return {
        key: video.videoId,
        label: video.videoId,
        status: 'conflict',
        reason:
          'No eligible creator for this channel. Include its profile or connect it in Creator Studio first.',
      };
    return {
      key: video.videoId,
      label: video.videoId,
      status: 'queue',
      reason: `Queue for ${target.slug}. The worker will verify the video and classify its content.`,
    };
  });
  const all = [...creators, ...videos];
  const summary = {
    profiles: creators.filter(p => p.status === 'insert').length,
    queued: videos.filter(v => v.status === 'queue').length,
    skipped: all.filter(r => r.status === 'skip').length,
    conflicts: all.filter(r => r.status === 'conflict').length,
  };
  const fingerprint = createHash('sha256')
    .update(JSON.stringify({ input, creators, videos, targets: [...targets] }))
    .digest('hex');
  const preview: CreatorImportPreview = { fingerprint, creators, videos, summary };
  return { preview, targets };
}

export function createCreatorImportService(database: Database = db) {
  return {
    async preview(value: CreatorImport) {
      const input = creatorImportSchema.parse(value);
      return database.transaction(async tx => (await planImport(tx, input)).preview, {
        isolationLevel: 'repeatable read',
        accessMode: 'read only',
      });
    },
    async apply(value: CreatorImport, fingerprint: string) {
      const input = creatorImportSchema.parse(value);
      try {
        return await database.transaction(
          async tx => {
            // Serialize admin imports; normal profile/channel writes are additionally protected by serializable isolation.
            await tx.execute(sql`SELECT pg_advisory_xact_lock(873125904)`);
            const { preview, targets } = await planImport(tx, input);
            if (preview.fingerprint !== fingerprint)
              throw new CreatorError(
                'The directory or queue changed. Preview the file again.',
                409,
              );
            if (preview.summary.conflicts)
              throw new CreatorError('Resolve the conflicts in this file before importing.', 409);
            const created = new Map<string, string>();
            for (const row of preview.creators.filter(r => r.status === 'insert')) {
              const inputProfile = input.creators.find(p => p.slug === row.key)!;
              const [profile] = await tx
                .insert(creatorProfile)
                .values({ slug: row.key, ownerId: null, profile: profileDocument(inputProfile) })
                .returning({ id: creatorProfile.id });
              created.set(row.key, profile.id);
              for (const channelId of directoryChannelIds(inputProfile.links)) {
                await tx.insert(creatorYoutubeChannel).values({ channelId }).onConflictDoNothing();
                await tx.insert(creatorChannel).values({
                  creatorId: profile.id,
                  channelId,
                  origin: 'curated',
                  sourceUrl: `https://www.youtube.com/channel/${channelId}`,
                });
              }
            }
            const queued = new Set(
              preview.videos.filter(v => v.status === 'queue').map(v => v.key),
            );
            const jobs = input.videos
              .filter(v => queued.has(v.videoId))
              .map(video => {
                const target = targets.get(video.channelId)!;
                return {
                  ...video,
                  creatorId: target.id ?? created.get(target.slug)!,
                  manuallyRequested: false,
                };
              });
            // Insert-only: never revive a skipped job or overwrite existing drafts/publications.
            for (let i = 0; i < jobs.length; i += 100)
              await tx.insert(creatorVideoJob).values(jobs.slice(i, i + 100));
            const { profiles, queued: count, skipped } = preview.summary;
            return { profiles, queued: count, skipped };
          },
          { isolationLevel: 'serializable' },
        );
      } catch (error) {
        const code =
          (error as { code?: string; cause?: { code?: string } }).cause?.code ??
          (error as { code?: string }).code;
        if (['23505', '40001', '40P01'].includes(code ?? ''))
          throw new CreatorError('The directory or queue changed. Preview the file again.', 409);
        throw error;
      }
    },
  };
}
