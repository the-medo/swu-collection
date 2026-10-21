import { creatorMigrationSection } from './migration-fixture.ts';
import { expect, test } from 'bun:test';
import { eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { user } from '../../db/schema/auth-schema.ts';
import {
  creation,
  creationRevision,
  creatorChannel,
  creatorProfile,
  creatorYoutube,
  creatorYoutubeChannel,
} from '../../db/schema/creator_hub.ts';
import { creationReport } from '../../db/schema/creation_report.ts';
import { creatorVideoJob as jobs } from '../../db/schema/creator_video_job.ts';
import { creatorProfileSchema } from '../../../shared/creators/contracts.ts';
import { emptyPostDocument } from '../../../shared/posts/content.ts';
import { createYoutubeMaintenance } from './youtube-maintenance.ts';
import { documentFromVideo, type VideoMetadata } from './video.ts';
import { createCreationsService } from './creations.ts';
import { createDiscoveryService } from './discovery.ts';
import { createWorkerStore } from './worker/store.ts';
import { eligibleChannels } from './channels.ts';
import { createChannelImportsService } from './channel-imports.ts';
import { seal, YoutubeAccessRevoked } from './youtube-credentials.ts';
import { refreshYoutubeAccess } from './youtube-access.ts';
import { youtubeService } from './youtube.ts';
import { disconnectYoutube } from './metadata-lifecycle.ts';

test.skipIf(process.env.CREATOR_LIFECYCLE_DB_TEST !== '1')(
  'YouTube lifecycle refresh, retention, revocation, independent imports and races',
  async () => {
    // Maintenance intentionally sees all rows: this test must use a disposable database.
    const target = new URL(process.env.DATABASE_URL!);
    if (
      target.hostname !== '127.0.0.1' ||
      !target.pathname.startsWith('/swubase_creator_lifecycle_')
    )
      throw new Error('Use a disposable creator lifecycle database.');
    const originalKey = process.env.YOUTUBE_TOKEN_ENCRYPTION_KEY;
    const originalClient = process.env.YOUTUBE_CLIENT_ID;
    const originalSecret = process.env.YOUTUBE_CLIENT_SECRET;
    const originalOrigin = process.env.BETTER_AUTH_URL;
    Object.assign(process.env, {
      YOUTUBE_TOKEN_ENCRYPTION_KEY: 'ab'.repeat(32),
      YOUTUBE_CLIENT_ID: 'fixture',
      YOUTUBE_CLIENT_SECRET: 'fixture',
      BETTER_AUTH_URL: 'https://example.com',
    });
    const id = crypto.randomUUID(),
      owner = `lifecycle-${id}`;
    const channelId = `UC${id.replaceAll('-', '').slice(0, 22)}`;
    const epoch = Date.now();
    let time = epoch;
    const date = (days: number) => new Date(epoch - days * 86400_000).toISOString();
    const fresh = new Map<string, VideoMetadata | null>();
    let failVideos = false,
      authMode: 'success' | 'outage' | 'revoked' = 'success';
    let providerCalls = 0;
    const youtube = {
      channels: async (ids: string[]) => {
        providerCalls++;
        return ids.map(channelId => ({
          channelId,
          title: 'Fresh channel',
          avatarUrl: 'https://example.com/fresh.png',
        }));
      },
      video: async (videoId: string) => {
        providerCalls++;
        if (failVideos) throw new Error('temporary');
        return fresh.get(videoId) ?? null;
      },
    };
    const exchange = async () => {
      if (authMode === 'revoked') throw new YoutubeAccessRevoked();
      if (authMode === 'outage') throw new Error('temporary');
      return { access_token: crypto.randomUUID(), expires_in: 3600 };
    };
    const maintain = createYoutubeMaintenance({
      database: db,
      youtube,
      exchange,
      clock: () => time,
    });
    const creations = createCreationsService(db);
    async function addVideo(index: number, origin: 'public' | 'oauth' = 'public', age = 8) {
      const videoId = `life${String(index).padStart(7, '0')}`;
      const metadata: VideoMetadata = {
        id: videoId,
        channelId,
        title: `Original title ${index}`,
        description: `Original description ${index}\n0:00 Intro\n0:30 Deck`,
        language: 'en',
        durationSeconds: 120,
        thumbnail: 'https://example.com/old.jpg',
        publishedAt: date(10),
      };
      const document = documentFromVideo(metadata, { fallbackLanguage: 'en' });
      const [row] = await db
        .insert(creation)
        .values({
          creatorId: id,
          authorId: owner,
          sourceVideoId: videoId,
          sourceChannelId: channelId,
          sourceDataOrigin: origin,
          sourceStatus: 'active',
          sourceMetadataAt: date(age),
          sourceCheckedAt: date(age),
          draft: document,
          published: document,
          publishedRevision: 1,
          publishedAt: date(10),
        })
        .returning();
      await db.insert(creationRevision).values({ creationId: row.id, revision: 1, document });
      await db.insert(jobs).values({
        videoId,
        creatorId: id,
        channelId,
        creationId: row.id,
        status: 'published',
        metadata,
        metadataFetchedAt: date(age),
        issues: [{ code: 'deck_link_pending_review', url: 'https://example.com/old' }],
      });
      fresh.set(videoId, {
        ...metadata,
        title: `Current title ${index}`,
        description: `Current description ${index}\n0:00 Start\n0:45 Guide`,
        thumbnail: 'https://example.com/new.jpg',
      });
      return row;
    }
    async function rowFor(row: typeof creation.$inferSelect) {
      return (await db.select().from(creation).where(eq(creation.id, row.id)))[0];
    }
    try {
      await db.insert(user).values({
        id: owner,
        name: 'Lifecycle fixture',
        displayName: 'Lifecycle fixture',
        email: `${owner}@invalid.local`,
        emailVerified: false,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const profile = creatorProfileSchema.parse({
        slug: `lifecycle-${id}`,
        name: 'Lifecycle fixture',
        bio: emptyPostDocument(),
        languages: ['en'],
        specialties: [],
        links: [],
      });
      await db.insert(creatorProfile).values({ id, ownerId: owner, slug: profile.slug, profile });
      await db.insert(creatorYoutubeChannel).values({
        channelId,
        title: 'Old channel',
        metadataOrigin: 'public',
        metadataUpdatedAt: date(8),
      });
      await db.insert(creatorChannel).values({ creatorId: id, channelId, origin: 'oauth' });
      await db.insert(creatorYoutube).values({
        creatorId: id,
        channelId,
        accessToken: seal('access'),
        refreshToken: seal('refresh'),
        expiresAt: date(1),
        checkedAt: date(2),
      });
      const normal = await addVideo(1),
        draftOnly = await addVideo(2),
        missing = await addVideo(3),
        old = await addVideo(4, 'public', 29);
      fresh.set(missing.sourceVideoId!, null);
      await db.insert(creationReport).values(
        [normal, missing].map(row => ({
          creationId: row.id,
          reporterId: owner,
          title: row.draft.title,
          sourceUrl: row.draft.sourceUrl,
        })),
      );
      await db
        .update(creation)
        .set({ published: null, publishedAt: null, publishedRevision: null })
        .where(eq(creation.id, draftOnly.id));
      await creations.save(
        id,
        owner,
        { ...normal.draft, title: 'My custom title', summary: 'Unpublished custom summary' },
        normal.id,
        normal.revision,
      );
      const beforeDryRun = await rowFor(normal);
      await maintain(50, true);
      expect(providerCalls).toBe(0);
      expect(await rowFor(normal)).toEqual(beforeDryRun);
      const result = await maintain();
      expect('failed' in result && result.failed).toBe(0);
      const updated = await rowFor(normal);
      expect(updated.draft.title).toBe('My custom title');
      expect(updated.draft.summary).toBe('Unpublished custom summary');
      expect(updated.draft.videoDescription).toContain('Current description');
      expect(updated.draft.chapters[1].startSeconds).toBe(45);
      expect(updated.published?.title).toBe('Current title 1');
      expect(updated.published?.summary).toContain('Current description');
      expect(updated.revision).toBeGreaterThan(updated.publishedRevision!);
      expect((await rowFor(draftOnly)).published).toBeNull();
      expect((await rowFor(missing)).sourceStatus).toBe('unavailable');
      expect((await rowFor(missing)).published).toBeNull();
      expect(
        (await db.select().from(creationReport).where(eq(creationReport.creationId, normal.id)))[0]
          .title,
      ).toBe('Current title 1');
      expect(
        (await db.select().from(creationReport).where(eq(creationReport.creationId, missing.id)))[0]
          .title,
      ).toBe('YouTube video unavailable');
      expect((await rowFor(old)).sourceStatus).toBe('expired');
      const history = await creations.revisions(normal.id, owner);
      expect(history.find(row => row.revision === 1)?.document.title).toBe('Current title 1');
      expect(history.find(row => row.revision === 2)?.document.title).toBe('My custom title');
      const removedHistory = await creations.revisions(missing.id, owner);
      expect(JSON.stringify(removedHistory)).not.toContain('Original description');
      expect(
        (await db.select().from(jobs).where(eq(jobs.videoId, normal.sourceVideoId!)))[0].metadata,
      ).toBeNull();
      await expect(
        creations.publish(missing.id, owner, (await rowFor(missing)).revision),
      ).rejects.toThrow('unavailable');
      const firstCalls = providerCalls;
      await maintain();
      expect(providerCalls).toBe(firstCalls);

      // A temporary API outage preserves current publications, then deadline cleanup removes copies.
      const outage = await addVideo(5);
      failVideos = true;
      await maintain();
      expect((await rowFor(outage)).published).not.toBeNull();
      expect((await rowFor(outage)).sourceStatus).toBe('active');
      await db
        .update(creation)
        .set({ sourceMetadataAt: date(29) })
        .where(eq(creation.id, outage.id));
      // Public reads fail closed before the next cleanup run.
      await expect(creations.get(outage.id)).rejects.toThrow('not found');
      expect(
        (await createDiscoveryService().discover({ creatorId: id, page: 1 })).items.some(
          item => item.id === outage.id,
        ),
      ).toBe(false);
      await maintain();
      expect((await rowFor(outage)).sourceStatus).toBe('expired');
      expect((await rowFor(outage)).draft.videoDescription).toBe('');
      failVideos = false;

      const consent = await addVideo(6, 'oauth', 0);
      const publiclyRefreshed = await addVideo(8, 'oauth');
      await db
        .update(creatorYoutube)
        .set({ checkedAt: date(2), lastCheckAttemptAt: date(2) })
        .where(eq(creatorYoutube.channelId, channelId));
      authMode = 'outage';
      await maintain();
      expect(
        await db.select().from(creatorYoutube).where(eq(creatorYoutube.channelId, channelId)),
      ).toHaveLength(1);
      authMode = 'revoked';
      time += 3600_001;
      await maintain();
      expect(
        await db.select().from(creatorYoutube).where(eq(creatorYoutube.channelId, channelId)),
      ).toHaveLength(0);
      expect((await eligibleChannels()).channels.get(channelId)).toBe(id);
      expect((await rowFor(publiclyRefreshed)).sourceDataOrigin).toBe('public');
      expect((await rowFor(publiclyRefreshed)).published).not.toBeNull();
      expect((await rowFor(normal)).published).not.toBeNull();
      expect((await rowFor(consent)).sourceStatus).toBe('authorization_removed');
      expect((await rowFor(consent)).published).toBeNull();
      expect((await rowFor(consent)).draft.videoDescription).toBe('');
      const status = (await youtubeService.status(id, owner)).channels[0];
      expect(status.connected).toBe(false);
      expect(status.disconnectReason).toBe('revoked');
      const controls = createChannelImportsService();
      await controls.setAutoImport(id, owner, channelId, false);
      expect((await eligibleChannels()).paused.has(channelId)).toBe(true);
      await controls.setAutoImport(id, owner, channelId, true);
      const store = createWorkerStore();
      await store.enqueue([{ creatorId: id, channelId, videoId: 'life0000099' }]);
      expect((await store.claim('life0000099'))?.channelId).toBe(channelId);

      // A stale failed request cannot disconnect a newly reauthorized connection.
      const [connection] = await db
        .insert(creatorYoutube)
        .values({
          creatorId: id,
          channelId,
          accessToken: seal('old'),
          refreshToken: seal('refresh'),
          expiresAt: date(1),
          checkedAt: date(2),
        })
        .returning();
      await db
        .update(creatorYoutube)
        .set({ accessToken: seal('new'), checkedAt: date(0) })
        .where(eq(creatorYoutube.channelId, channelId));
      expect(await disconnectYoutube(db, connection, 'revoked', date(0))).toBe(false);
      expect(
        await db.select().from(creatorYoutube).where(eq(creatorYoutube.channelId, channelId)),
      ).toHaveLength(1);
      const [current] = await db
        .select()
        .from(creatorYoutube)
        .where(eq(creatorYoutube.channelId, channelId));
      await expect(
        refreshYoutubeAccess(db, current, date(0), async () => {
          throw new YoutubeAccessRevoked();
        }),
      ).rejects.toThrow('Reconnect');
      expect((await eligibleChannels()).channels.get(channelId)).toBe(id);

      // Cleanup is independent of the refresh limit and never calls Google for expired consent.
      const expiredConsent = await addVideo(7, 'oauth', 0);
      await db.insert(creatorYoutube).values({
        creatorId: id,
        channelId,
        accessToken: seal('expired'),
        refreshToken: seal('refresh'),
        expiresAt: date(1),
        checkedAt: date(29),
        lastCheckAttemptAt: date(0),
      });
      await maintain(1);
      expect(
        await db.select().from(creatorYoutube).where(eq(creatorYoutube.channelId, channelId)),
      ).toHaveLength(0);
      expect((await rowFor(expiredConsent)).sourceStatus).toBe('authorization_removed');
      expect((await youtubeService.status(id, owner)).channels[0].disconnectReason).toBe('expired');
      expect((await eligibleChannels()).channels.get(channelId)).toBe(id);

      // Reauthorization releases consent-removed drafts for public refresh, never auto-publication.
      const savedFetch = globalThis.fetch;
      try {
        globalThis.fetch = (async (url: string | URL | Request) => {
          if (String(url).includes('oauth2.googleapis.com'))
            return Response.json({
              access_token: 'reconnected',
              refresh_token: 'refresh',
              expires_in: 3600,
            });
          if (String(url).includes('/youtube/v3/channels'))
            return Response.json({
              items: [{ id: channelId, snippet: { title: 'Reconnected channel' } }],
            });
          throw new Error('Unexpected provider request');
        }) as unknown as typeof fetch;
        const connect = await youtubeService.connect(id, owner, 'fixture-session');
        await youtubeService.callback(
          owner,
          'fixture-session',
          new URL(connect.url).searchParams.get('state')!,
          'code',
        );
      } finally {
        globalThis.fetch = savedFetch;
      }
      expect((await rowFor(expiredConsent)).sourceStatus).toBe('expired');
      await maintain();
      const recovered = await rowFor(expiredConsent);
      expect(recovered.sourceStatus).toBe('active');
      expect(recovered.sourceDataOrigin).toBe('public');
      expect(recovered.draft.title).toBe('Current title 7');
      expect(recovered.published).toBeNull();
      await creations.publish(recovered.id, owner, recovered.revision);

      // Once the editor publishes their custom fields, public refresh protects those too.
      const editable = await rowFor(normal);
      await creations.publish(normal.id, owner, editable.revision);
      await db
        .update(creation)
        .set({ sourceMetadataAt: date(8), sourceCheckedAt: date(8) })
        .where(eq(creation.id, normal.id));
      await maintain();
      expect((await rowFor(normal)).published?.title).toBe('My custom title');
      expect((await rowFor(normal)).published?.summary).toBe('Unpublished custom summary');
      const beforeUnchanged = await rowFor(normal);
      await db
        .update(creation)
        .set({ sourceMetadataAt: date(8), sourceCheckedAt: date(8) })
        .where(eq(creation.id, normal.id));
      await maintain();
      expect((await rowFor(normal)).revision).toBe(beforeUnchanged.revision);
      expect(Date.parse((await rowFor(normal)).sourceMetadataAt!)).toBe(time);
      expect((await rowFor(normal)).publicUpdatedAt).toBe(beforeUnchanged.publicUpdatedAt);
      // Removed custom provider fields no longer protect the placeholder on recovery.
      await db
        .update(creation)
        .set({ sourceMetadataAt: date(8), sourceCheckedAt: date(8) })
        .where(eq(creation.id, normal.id));
      const normalMetadata = fresh.get(normal.sourceVideoId!)!;
      fresh.set(normal.sourceVideoId!, null);
      await maintain();
      expect((await rowFor(normal)).manuallyEditedFields).not.toContain('title');
      expect((await rowFor(normal)).draft.title).toBe('YouTube video unavailable');
      fresh.set(normal.sourceVideoId!, normalMetadata);
      await db
        .update(creation)
        .set({ sourceCheckedAt: date(8) })
        .where(eq(creation.id, normal.id));
      await maintain();
      const restored = await rowFor(normal);
      expect(restored.draft.title).toBe('Current title 1');
      expect(restored.published).toBeNull();
      await creations.publish(normal.id, owner, restored.revision);

      // Scheduler overlap returns without making requests; no provider or Gemini side effects.
      await db.transaction(async tx => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(873125905)`);
        const overlapping = await maintain();
        expect('alreadyRunning' in overlapping && overlapping.alreadyRunning).toBe(true);
      });
    } finally {
      await db.delete(user).where(eq(user.id, owner));
      await db.delete(creatorYoutubeChannel).where(eq(creatorYoutubeChannel.channelId, channelId));
      for (const [key, value] of Object.entries({
        YOUTUBE_TOKEN_ENCRYPTION_KEY: originalKey,
        YOUTUBE_CLIENT_ID: originalClient,
        YOUTUBE_CLIENT_SECRET: originalSecret,
        BETTER_AUTH_URL: originalOrigin,
      })) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  },
  60_000,
);

test.skipIf(process.env.CREATOR_LIFECYCLE_DB_TEST !== '1')(
  'legacy protection backfill distinguishes published edits, draft-only edits, restoration and missing history',
  async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (
      target.hostname !== '127.0.0.1' ||
      !target.pathname.startsWith('/swubase_creator_lifecycle_')
    )
      throw new Error('Use a disposable creator lifecycle database.');
    const migration = await creatorMigrationSection('youtube_revision_provenance');
    await db.transaction(async tx => {
      await tx.execute(
        sql.raw(`
      CREATE TEMP TABLE creation (id integer PRIMARY KEY, revision integer, published_revision integer, draft jsonb, published jsonb, manually_edited_fields jsonb, published_manually_edited_fields jsonb) ON COMMIT DROP;
      CREATE TEMP TABLE creation_revision (creation_id integer, revision integer, document jsonb, manually_edited_fields jsonb) ON COMMIT DROP;
      INSERT INTO creation VALUES (1, 4, 2, '{"title":"Original","summary":"New draft"}', '{"title":"Published custom","summary":"Original"}', '["title","summary"]', '[]'),
        (2, 40, 39, '{"title":"Draft"}', '{"title":"Published"}', '["title"]', '[]');
      INSERT INTO creation_revision VALUES (1, 1, '{"title":"Original","summary":"Original"}', '[]'),
        (1, 2, '{"title":"Published custom","summary":"Original"}', '[]'),
        (1, 3, '{"title":"Another draft","summary":"New draft"}', '[]'),
        (1, 4, '{"title":"Original","summary":"New draft"}', '[]'),
        (2, 39, '{"title":"Published"}', '[]'), (2, 40, '{"title":"Draft"}', '[]');
    `),
      );
      await tx.execute(sql.raw(migration));
      expect(
        Array.from(
          await tx.execute(
            sql`SELECT published_manually_edited_fields AS fields FROM creation ORDER BY id`,
          ),
        ),
      ).toEqual([{ fields: ['title'] }, { fields: ['title'] }]);
      expect(
        Array.from(
          await tx.execute(
            sql`SELECT manually_edited_fields AS fields FROM creation_revision ORDER BY creation_id, revision`,
          ),
        ),
      ).toEqual([
        { fields: [] },
        { fields: ['title'] },
        { fields: ['title', 'summary'] },
        { fields: ['title', 'summary'] },
        { fields: ['title'] },
        { fields: ['title'] },
      ]);
    });
  },
);
