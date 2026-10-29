import { eligibleChannels, refreshDirectoryHandles } from '../channels.ts';
import type { Database } from '../types.ts';
import { WorkerError } from './contracts.ts';
import { createQueueStore } from './queue.ts';
import type { youtubeClient } from './providers.ts';

/** Manual requests reuse discovery, scoped to one verified channel, without classifying in HTTP. */
export function createVideoDiscovery(
  database: Database,
  youtube: () => ReturnType<typeof youtubeClient>,
) {
  const store = createQueueStore(database);
  return async function discover(
    since = new Date(Date.now() - 7 * 86400_000).toISOString(),
    manual?: { channelId: string; creatorId: string },
  ) {
    if (!Number.isFinite(Date.parse(since))) throw new WorkerError('invalid_discovery_date', false);
    const api = youtube();
    // A creator request must never trigger provider lookups for other creators.
    const unresolvedHandles = manual
      ? []
      : await refreshDirectoryHandles(database, api.channelForHandle);
    const eligible = await eligibleChannels(database);
    if (manual && eligible.channels.get(manual.channelId) !== manual.creatorId)
      throw new WorkerError('channel_no_longer_eligible', false);
    const channels = new Map(
      [...eligible.channels].filter(([id]) =>
        manual ? id === manual.channelId : !eligible.paused.has(id),
      ),
    );
    const playlists = await api.playlists([...channels.keys()]);
    let enqueued = 0;
    const incomplete: string[] = [];
    const unavailablePlaylists: { channelId: string; playlistId: string }[] = [];
    // Bound interactive requests to 150 uploads; scheduled discovery can scan 1,000.
    const maxPages = manual ? 3 : 20;
    for (const { channelId, playlistId } of playlists) {
      if (!channels.has(channelId)) continue;
      let pageToken: string | undefined;
      for (let page = 0; page < maxPages; page++) {
        let result: Awaited<ReturnType<typeof api.uploads>>;
        try {
          result = await api.uploads(playlistId, pageToken);
        } catch (error) {
          // YouTube can advertise an uploads playlist that does not exist for an
          // empty channel. Report it, then let other channels and queued jobs run.
          if (!(error instanceof WorkerError) || error.code !== 'youtube_http_404') throw error;
          unavailablePlaylists.push({ channelId, playlistId });
          if (page > 0) incomplete.push(channelId);
          break;
        }
        // Recheck disconnect/ownership/pause after provider latency. Processing checks again.
        const current = await eligibleChannels(database);
        if (current.channels.get(channelId) !== channels.get(channelId))
          throw new WorkerError('channel_no_longer_eligible', false);
        if (!manual && current.paused.has(channelId)) break;
        const inWindow = result.videos.filter(
          v => v.publishedAt && Date.parse(v.publishedAt) >= Date.parse(since),
        );
        enqueued += await store.enqueue(
          inWindow.map(v => ({
            videoId: v.id,
            channelId,
            creatorId: channels.get(channelId)!,
          })),
          !!manual,
        );
        if (
          !result.nextPageToken ||
          result.videos.some(v => v.publishedAt && Date.parse(v.publishedAt) < Date.parse(since))
        )
          break;
        pageToken = result.nextPageToken;
        if (page === maxPages - 1) incomplete.push(channelId);
      }
    }
    return {
      channels: channels.size,
      enqueued,
      conflicts: eligible.conflicts,
      incomplete,
      unavailablePlaylists,
      unresolvedHandles,
      missingChannels: [...channels.keys()].filter(id => !playlists.some(p => p.channelId === id)),
    };
  };
}
