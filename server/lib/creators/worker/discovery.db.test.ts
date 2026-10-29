// CREATOR_WORKER_DB_TEST=1 bun --env-file=.env.worktree test server/lib/creators/worker/discovery.db.test.ts
import { expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/index.ts';
import {
  creation,
  creatorChannel,
  creatorProfile,
  creatorYoutubeChannel,
} from '../../../db/schema/creator_hub.ts';
import { creatorProfileSchema } from '../../../../shared/creators/contracts.ts';
import { emptyPostDocument } from '../../../../shared/posts/content.ts';
import { monitoredWorkerCommand, workerCommand } from './command.ts';
import { youtubeClient } from './providers.ts';
import { createVideoWorker } from './worker.ts';
import { WorkerError, type VideoMetadata } from './contracts.ts';

test.skipIf(process.env.CREATOR_WORKER_DB_TEST !== '1')(
  'a missing uploads playlist does not block other creators or queued video processing',
  async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_'))
      throw new Error('Use an isolated worktree database.');
    const originalFetch = globalThis.fetch;
    const rollback = new Error('Rollback discovery fixtures');
    try {
      await db.transaction(async tx => {
        const random = () => crypto.randomUUID().replaceAll('-', '');
        const creators = [crypto.randomUUID(), crypto.randomUUID()];
        const channels = creators.map(() => `UC${random().slice(0, 22)}`);
        const playlists = channels.map(id => `UU${id.slice(2)}`);
        const videos: VideoMetadata[] = channels.map(channelId => ({
          id: random().slice(0, 11),
          channelId,
          title: 'Star Wars Unlimited deck guide',
          description: '',
          durationSeconds: 120,
          // Simulate uploads missed during a three-day importer outage.
          publishedAt: new Date(Date.now() - 3 * 86400_000).toISOString(),
          language: 'en',
          thumbnail: '',
        }));
        for (const [index, id] of creators.entries()) {
          const profile = creatorProfileSchema.parse({
            slug: `discovery-${id}`,
            name: 'Discovery fixture',
            bio: emptyPostDocument(),
            languages: ['en'],
            specialties: [],
            links: [],
          });
          await tx.insert(creatorProfile).values({ id, slug: profile.slug, profile });
          await tx.insert(creatorYoutubeChannel).values({ channelId: channels[index] });
          await tx.insert(creatorChannel).values({
            channelId: channels[index],
            creatorId: id,
            origin: 'public',
          });
        }
        let failureStatus = 404;
        let failSecondPage = false;
        let failChannelLookup = false;
        let generated = 0;
        const requests: string[] = [];
        globalThis.fetch = (async input => {
          const url = new URL(String(input));
          expect(url.origin + url.pathname).toBe(
            'https://www.googleapis.com/youtube/v3/playlistItems',
          );
          const playlist = url.searchParams.get('playlistId')!;
          const index = playlists.indexOf(playlist);
          expect(index).toBeGreaterThanOrEqual(0);
          requests.push(playlist);
          if (
            index === 0 &&
            failureStatus &&
            (!failSecondPage || url.searchParams.has('pageToken'))
          )
            return Response.json(
              { error: { errors: [{ reason: 'playlistNotFound' }] } },
              { status: failureStatus },
            );
          return Response.json({
            ...(index === 0 && failSecondPage ? { nextPageToken: 'next' } : {}),
            items: videos
              .filter(video => video.channelId === channels[index])
              .map(video => ({
                contentDetails: {
                  videoId: video.id,
                  videoPublishedAt: video.publishedAt,
                },
              })),
          });
        }) as typeof fetch;
        const worker = {
          ...createVideoWorker({
            database: tx,
            youtube: {
              channels: async () => [],
              channelForHandle: async () => null,
              playlists: async ids => {
                if (failChannelLookup) throw new WorkerError('youtube_http_404', false);
                return channels.flatMap((channelId, index) =>
                  ids.includes(channelId) ? [{ channelId, playlistId: playlists[index] }] : [],
                );
              },
              uploads: youtubeClient('fixture-key').uploads,
              video: async id => videos.find(video => video.id === id) ?? null,
            },
            cards: async () => ({}),
            generate: async () => {
              generated++;
              return {
                value: {
                  relevance: 'primary',
                  confidence: 0.99,
                  evidence: videos[0].title,
                  reason: 'SWU title',
                  language: 'en',
                  tags: [],
                  leaders: [],
                  sets: [],
                },
                usage: { input: 100, output: 50, thinking: 0 },
              };
            },
            fetchDeck: async () => {
              throw new Error('Unexpected deck request');
            },
          }),
          // Keep maintenance outside this discovery/processing regression.
          maintain: async () => ({
            videosRefreshed: 0,
            videosRemoved: 0,
            channelsRefreshed: 0,
            connectionsChecked: 0,
            connectionsRemoved: 0,
            expired: 0,
            failed: 0,
          }),
        };
        const monitor: string[] = [];
        let summary: Awaited<ReturnType<typeof workerCommand>> | undefined;
        const tick = (video = videos[1].id) =>
          monitoredWorkerCommand(
            async () => (summary = await workerCommand(['tick', '--video', video], worker)),
            {
              started: () => {
                monitor.push('started');
              },
              finished: () => {
                monitor.push('finished');
              },
              crashed: error => {
                monitor.push(error.message);
              },
            },
            async () => {
              monitor.push('flush');
            },
            () => {},
          );
        expect(await tick()).toBe(0);
        expect(summary).toMatchObject({
          discovery: {
            enqueued: 1,
            unavailablePlaylists: [{ channelId: channels[0], playlistId: playlists[0] }],
            incomplete: [],
          },
          run: { published: 1, failed: 0 },
        });
        expect(requests).toEqual(playlists);
        expect(monitor).toEqual(['started', 'finished', 'flush']);
        const [published] = await tx
          .select()
          .from(creation)
          .where(eq(creation.sourceVideoId, videos[1].id));
        expect(published.published).not.toBeNull();
        expect(Date.parse(published.publishedAt!)).toBe(Date.parse(videos[1].publishedAt));
        expect(generated).toBe(1);

        // Explicit recovery still works if deployment happens after the seven-day window.
        const olderVideo = {
          ...videos[1],
          id: random().slice(0, 11),
          publishedAt: new Date(Date.now() - 10 * 86400_000).toISOString(),
        };
        videos.push(olderVideo);
        expect(await tick(olderVideo.id)).toBe(0);
        expect(summary).toMatchObject({ discovery: { enqueued: 0 }, run: { processed: 0 } });
        const backfillArgs = ['discover', '--since', olderVideo.publishedAt.slice(0, 10)];
        expect(await workerCommand(backfillArgs, worker)).toMatchObject({
          discovery: { enqueued: 1, incomplete: [] },
        });
        expect(generated).toBe(1); // Discovery queues work without classifying it.
        expect(await workerCommand(['run', '--video', olderVideo.id], worker)).toMatchObject({
          run: { published: 1, failed: 0 },
        });
        const [recovered] = await tx
          .select()
          .from(creation)
          .where(eq(creation.sourceVideoId, olderVideo.id));
        expect(Date.parse(recovered.publishedAt!)).toBe(Date.parse(olderVideo.publishedAt));
        expect(await workerCommand(backfillArgs, worker)).toMatchObject({
          discovery: { enqueued: 0 },
        });
        expect(generated).toBe(2);

        // Manual discovery of an empty channel also completes without enqueuing work.
        requests.length = 0;
        expect(
          await worker.discover(undefined, { channelId: channels[0], creatorId: creators[0] }),
        ).toMatchObject({
          enqueued: 0,
          unavailablePlaylists: [{ channelId: channels[0], playlistId: playlists[0] }],
        });
        expect(requests).toEqual([playlists[0]]);

        expect(await tick()).toBe(0);
        expect(summary).toMatchObject({ discovery: { enqueued: 0 }, run: { processed: 0 } });
        expect(generated).toBe(2);

        // The same channel is retried next time, including a playlist disappearing mid-scan.
        failSecondPage = true;
        monitor.length = 0;
        expect(await tick(videos[0].id)).toBe(1);
        expect(summary).toMatchObject({
          discovery: {
            enqueued: 1,
            unavailablePlaylists: [{ channelId: channels[0], playlistId: playlists[0] }],
            incomplete: [channels[0]],
          },
          run: { published: 1 },
        });
        expect(monitor).toEqual(['started', 'creator_video_discovery_incomplete', 'flush']);
        expect(
          await worker.discover(undefined, { channelId: channels[0], creatorId: creators[0] }),
        ).toMatchObject({ enqueued: 0, incomplete: [channels[0]] });
        failSecondPage = false;
        failureStatus = 0;
        expect(await tick()).toBe(0);
        expect(summary).toMatchObject({ discovery: { unavailablePlaylists: [], enqueued: 0 } });

        // Quota, credential and service failures must still fail monitoring.
        for (const status of [401, 403, 429, 500]) {
          failureStatus = status;
          monitor.length = 0;
          expect(await tick()).toBe(1);
          expect(monitor).toEqual(['started', `youtube_http_${status}`, 'flush']);
        }
        // The exception is specific to uploads, not all YouTube 404 responses.
        failChannelLookup = true;
        monitor.length = 0;
        expect(await tick()).toBe(1);
        expect(monitor).toEqual(['started', 'youtube_http_404', 'flush']);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
  30_000,
);
