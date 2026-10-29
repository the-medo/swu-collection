import { and, eq, inArray, isNull, sql, type SQLWrapper } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  creatorProfile,
  creatorYoutubeChannel,
  creatorChannel,
} from '../../db/schema/creator_hub.ts';
import { creatorChannelResolution } from '../../db/schema/creator_video_job.ts';
import { now, type Database, type Connection } from './types.ts';

import { directoryChannelIds } from '../../../shared/creators/youtube.ts';
export { directoryChannelIds } from '../../../shared/creators/youtube.ts';

export function directoryHandle(value: string) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      !['youtube.com', 'www.youtube.com'].includes(url.hostname)
    )
      return null;
    const match = /^\/@([^/]{1,100})(?:\/(?:videos|streams|shorts|featured|about))?\/?$/.exec(
      url.pathname,
    );
    if (!match) return null;
    const handle = decodeURIComponent(match[1]);
    return { url: `https://www.youtube.com/@${encodeURIComponent(handle)}`, handle };
  } catch {
    return null;
  }
}

export async function refreshDirectoryHandles(
  database: Database,
  lookup: (handle: string) => Promise<string | null>,
) {
  const profiles = await database
    .select({ profile: creatorProfile.profile })
    .from(creatorProfile)
    .where(isNull(creatorProfile.ownerId));
  const handles = new Map(
    profiles.flatMap(p =>
      p.profile.links.flatMap(l => {
        const handle = directoryHandle(l.url);
        return handle ? [[handle.url, handle] as const] : [];
      }),
    ),
  );

  const cached = new Map(
    (handles.size
      ? await database
          .select()
          .from(creatorChannelResolution)
          .where(inArray(creatorChannelResolution.url, [...handles.keys()]))
      : []
    ).map(r => [r.url, r]),
  );
  const unresolved: string[] = [];
  for (const handle of handles.values()) {
    const previous = cached.get(handle.url);
    if (previous && Date.parse(previous.resolvedAt) > Date.now() - 22 * 3600_000) continue;
    const channelId = await lookup(handle.handle);
    if (channelId) {
      await database
        .insert(creatorChannelResolution)
        .values({ url: handle.url, channelId, resolvedAt: now() })
        .onConflictDoUpdate({
          target: creatorChannelResolution.url,
          set: { channelId, resolvedAt: now() },
        });
    } else {
      await database
        .delete(creatorChannelResolution)
        .where(eq(creatorChannelResolution.url, handle.url));
      unresolved.push(handle.url);
    }
  }
  await syncCuratedChannels(database);
  return unresolved;
}

/** Refresh associations once per discovery/run, never once per video. */
export async function syncCuratedChannels(database: Database = db) {
  await database.transaction(async tx => {
    const profiles = await tx
      .select()
      .from(creatorProfile)
      .where(isNull(creatorProfile.ownerId))
      .orderBy(creatorProfile.id)
      .for('update');
    const handles = new Map(
      (await tx.select().from(creatorChannelResolution)).map(row => [row.url, row]),
    );
    for (const profile of profiles) {
      const associations = new Map<
        string,
        { channelId: string; sourceUrl: string; resolvedAt: string | null }
      >();
      for (const link of profile.profile.links) {
        const handle = directoryHandle(link.url);
        const resolved = handle && handles.get(handle.url);
        if (resolved)
          associations.set(resolved.channelId, {
            channelId: resolved.channelId,
            sourceUrl: resolved.url,
            resolvedAt: resolved.resolvedAt,
          });
      }
      // Stable ID links take precedence over a handle for the same channel.
      for (const channelId of directoryChannelIds(profile.profile.links))
        associations.set(channelId, {
          channelId,
          sourceUrl: `https://www.youtube.com/channel/${channelId}`,
          resolvedAt: null,
        });
      await tx
        .delete(creatorChannel)
        .where(and(eq(creatorChannel.creatorId, profile.id), eq(creatorChannel.origin, 'curated')));
      for (const association of associations.values()) {
        await tx
          .insert(creatorYoutubeChannel)
          .values({ channelId: association.channelId })
          .onConflictDoNothing();
        await tx
          .insert(creatorChannel)
          .values({ creatorId: profile.id, origin: 'curated', ...association })
          .onConflictDoNothing();
      }
    }
  });
}

/** Curated links only apply to ownerless profiles and recently resolved handles. */
export function eligibleChannelAssociation(
  channel: { origin: SQLWrapper; resolvedAt: SQLWrapper } = creatorChannel,
  profile: { ownerId: SQLWrapper } = creatorProfile,
) {
  return sql`((${channel.origin} IN ('oauth', 'public'))
    OR (${channel.origin} = 'curated' AND ${profile.ownerId} IS NULL
      AND (${channel.resolvedAt} IS NULL OR ${channel.resolvedAt} > now() - interval '24 hours')))`;
}

/** Curated associations grant import access only for ownerless profiles. */
export async function eligibleChannels(database: Connection = db) {
  const candidates = await database
    .select({
      channelId: creatorChannel.channelId,
      creatorId: creatorChannel.creatorId,
      autoImportEnabled: creatorYoutubeChannel.autoImportEnabled,
    })
    .from(creatorChannel)
    .innerJoin(creatorYoutubeChannel, eq(creatorYoutubeChannel.channelId, creatorChannel.channelId))
    .innerJoin(creatorProfile, eq(creatorProfile.id, creatorChannel.creatorId))
    .where(eligibleChannelAssociation());
  const channels = new Map<string, string>();
  const conflicts = new Set<string>();
  for (const candidate of candidates) {
    if (
      channels.has(candidate.channelId) &&
      channels.get(candidate.channelId) !== candidate.creatorId
    )
      conflicts.add(candidate.channelId);
    channels.set(candidate.channelId, candidate.creatorId);
  }
  for (const channel of conflicts) channels.delete(channel);
  return {
    channels,
    conflicts: [...conflicts],
    paused: new Set(candidates.filter(c => !c.autoImportEnabled).map(c => c.channelId)),
  };
}
