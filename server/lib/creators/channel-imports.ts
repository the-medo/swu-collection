import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { creatorChannel, creatorYoutubeChannel } from '../../db/schema/creator_hub.ts';
import {
  CHANNEL_FETCH_COOLDOWN_MS,
  type CreatorChannelFetchResult,
} from '../../../shared/creators/contracts.ts';
import { requireCreator } from './permissions.ts';
import { CreatorError } from './errors.ts';
import { now, type Database, type Connection } from './types.ts';
import { createVideoDiscovery } from './worker/discovery.ts';
import { youtubeClient } from './worker/providers.ts';
import { WorkerError } from './worker/contracts.ts';

export const channelFetchingConfigured = () =>
  !!process.env.YOUTUBE_API_KEY && !!process.env.GEMINI_API_KEY;

export function createChannelImportsService(
  database: Database = db,
  options: { youtube?: ReturnType<typeof youtubeClient> } = {},
) {
  async function ownedChannel(
    tx: Connection,
    creatorId: string,
    viewerId: string,
    channelId: string,
  ) {
    // Match connect/disconnect's owner-only check and profile-first lock order.
    await requireCreator(tx, creatorId, viewerId, true, true);
    const [channel] = await tx
      .select({ channel: creatorYoutubeChannel })
      .from(creatorChannel)
      .innerJoin(
        creatorYoutubeChannel,
        eq(creatorChannel.channelId, creatorYoutubeChannel.channelId),
      )
      .where(
        and(
          eq(creatorChannel.creatorId, creatorId),
          eq(creatorChannel.channelId, channelId),
          inArray(creatorChannel.origin, ['oauth', 'public']),
        ),
      )
      .for('update', { of: creatorYoutubeChannel });
    if (!channel) throw new CreatorError('Connect this channel first.', 403);
    return channel.channel;
  }
  return {
    async setAutoImport(creatorId: string, viewerId: string, channelId: string, enabled: boolean) {
      await database.transaction(async tx => {
        await ownedChannel(tx, creatorId, viewerId, channelId);
        await tx
          .update(creatorYoutubeChannel)
          .set({ autoImportEnabled: enabled })
          .where(eq(creatorYoutubeChannel.channelId, channelId));
      });
    },
    async fetchNew(
      creatorId: string,
      viewerId: string,
      channelId: string,
    ): Promise<CreatorChannelFetchResult> {
      await database.transaction(async tx => {
        const channel = await ownedChannel(tx, creatorId, viewerId, channelId);
        if (!options.youtube && !channelFetchingConfigured())
          throw new CreatorError('Video fetching is not configured yet.', 503);
        if (
          channel.lastManualFetchAt &&
          Date.parse(channel.lastManualFetchAt) > Date.now() - CHANNEL_FETCH_COOLDOWN_MS
        )
          throw new CreatorError(
            'This channel was checked recently. Please wait five minutes between fetches.',
            429,
          );
        await tx
          .update(creatorYoutubeChannel)
          .set({ lastManualFetchAt: now() })
          .where(eq(creatorYoutubeChannel.channelId, channelId));
      });
      try {
        const discover = createVideoDiscovery(
          database,
          () =>
            options.youtube ??
            youtubeClient(process.env.YOUTUBE_API_KEY!, AbortSignal.timeout(8_000)),
        );
        const result = await discover(undefined, { channelId, creatorId });
        if (result.missingChannels.length)
          throw new CreatorError(
            'YouTube could not find this channel. Check the connection and try again later.',
            503,
          );
        return { enqueued: result.enqueued, incomplete: result.incomplete.length > 0 };
      } catch (error) {
        if (error instanceof CreatorError) throw error;
        if (error instanceof WorkerError && error.code === 'channel_no_longer_eligible')
          throw new CreatorError(
            'This channel connection changed or conflicts with another creator. Reconnect or contact SWUBASE.',
            409,
          );
        // No provider payloads or credentials in API errors. Queued pages survive partial failures.
        throw new CreatorError(
          'Could not finish checking YouTube. Any videos already found stay queued. Try again in five minutes.',
          503,
        );
      }
    },
  };
}
export const channelImportsService = createChannelImportsService();
