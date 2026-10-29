import { creatorMigrationSection } from './migration-fixture.ts';
import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { user } from '../../db/schema/auth-schema.ts';
import {
  creation,
  creatorChannel,
  creatorMember,
  creatorProfile,
  creatorYoutube,
  creatorYoutubeChannel,
} from '../../db/schema/creator_hub.ts';
import { creatorVideoJob as jobs } from '../../db/schema/creator_video_job.ts';
import {
  creationDocumentSchema,
  creatorProfileSchema,
} from '../../../shared/creators/contracts.ts';
import { emptyPostDocument } from '../../../shared/posts/content.ts';
import type { AuthExtension } from '../../auth/auth.ts';
import { createCreatorHubRoute } from '../../routes/creator-hub.ts';
import { createChannelImportsService } from './channel-imports.ts';
import { createCreationsService } from './creations.ts';
import { createWorkerStore } from './worker/store.ts';
import { createVideoDiscovery } from './worker/discovery.ts';
import { assertChannelImportAllowed } from './worker/channel-policy.ts';
import { WorkerError } from './worker/contracts.ts';
import type { youtubeClient } from './worker/providers.ts';

test.skipIf(process.env.CREATOR_HUB_DB_TEST !== '1')(
  'channel-scoped fetch, owner controls, pause races and manual field ownership',
  async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_'))
      throw new Error('Use an isolated worktree database.');
    const random = () => crypto.randomUUID().replaceAll('-', '');
    const owner = `channel-owner-${random()}`,
      editor = `channel-editor-${random()}`,
      stranger = `channel-stranger-${random()}`;
    const profileIds = [crypto.randomUUID(), crypto.randomUUID()];
    const channelIds = [0, 1, 2].map(() => `UC${random().slice(0, 22)}`);
    const videos = [0, 1, 2, 3, 4].map(() => random().slice(0, 11));
    const document = (id: string) =>
      creationDocumentSchema.parse({
        title: 'Star Wars Unlimited guide',
        medium: 'video',
        body: emptyPostDocument(),
        sourceUrl: `https://www.youtube.com/watch?v=${id}`,
        tags: [],
        references: [],
        chapters: [],
      });
    let playlistCalls: string[][] = [],
      uploadCalls: string[] = [],
      handleCalls = 0;
    let onUpload = async () => {};
    let nextPageToken: string | undefined;
    const api: ReturnType<typeof youtubeClient> = {
      channels: async () => [],
      video: async () => {
        throw new Error('Discovery must not process videos');
      },
      channelForHandle: async () => {
        handleCalls++;
        return null;
      },
      playlists: async ids => {
        playlistCalls.push(ids);
        return ids.map(channelId => ({ channelId, playlistId: channelId }));
      },
      uploads: async channelId => {
        uploadCalls.push(channelId);
        await onUpload();
        return {
          nextPageToken,
          videos: (channelId === channelIds[0] ? videos.slice(0, 2) : [videos[2]]).map(id => ({
            id,
            publishedAt: new Date().toISOString(),
          })),
        };
      },
    };
    const controls = createChannelImportsService(db, { youtube: api });
    const creations = createCreationsService(db);
    const store = createWorkerStore();
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        const id = c.req.header('x-fixture-user');
        c.set('user', id ? ({ id } as NonNullable<AuthExtension['Variables']['user']>) : null);
        await next();
      })
      .route('/', createCreatorHubRoute(undefined, undefined, undefined, controls));
    const request = (
      viewer: string | null,
      action: 'fetch' | 'settings',
      channelId = channelIds[0],
      csrf = true,
      creatorId = profileIds[0],
    ) =>
      app.request(`/creators/${creatorId}/youtube/${action}`, {
        method: action === 'fetch' ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(viewer ? { 'x-fixture-user': viewer } : {}),
          ...(csrf ? { 'X-Requested-With': 'swubase' } : {}),
        },
        body: JSON.stringify({
          channelId,
          ...(action === 'settings' ? { autoImportEnabled: false } : {}),
        }),
      });
    const resetCooldown = () =>
      db
        .update(creatorYoutubeChannel)
        .set({ lastManualFetchAt: null })
        .where(eq(creatorYoutubeChannel.channelId, channelIds[0]));
    try {
      await db.insert(user).values(
        [owner, editor, stranger].map(id => ({
          id,
          name: 'Import fixture',
          displayName: id,
          email: `${id}@invalid.local`,
          emailVerified: false,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      for (const [i, id] of profileIds.entries()) {
        const profile = creatorProfileSchema.parse({
          slug: `channel-${id}`,
          name: 'Import fixture',
          bio: emptyPostDocument(),
          languages: ['en'],
          specialties: [],
          links: [],
        });
        await db
          .insert(creatorProfile)
          .values({ id, slug: profile.slug, profile, ownerId: i ? stranger : owner });
      }
      await db.insert(creatorMember).values({ creatorId: profileIds[0], userId: editor });
      for (const [i, channelId] of channelIds.entries()) {
        const creatorId = profileIds[i === 2 ? 1 : 0];
        await db.insert(creatorYoutubeChannel).values({ channelId });
        await db.insert(creatorChannel).values({ creatorId, channelId, origin: 'oauth' });
        await db.insert(creatorYoutube).values({
          creatorId,
          channelId,
          accessToken: 'fixture',
          expiresAt: new Date().toISOString(),
        });
      }
      for (const action of ['fetch', 'settings'] as const) {
        expect((await request(null, action)).status).toBe(401);
        expect((await request(owner, action, channelIds[0], false)).status).toBe(403);
        expect((await request(editor, action)).status).toBe(403);
        expect((await request(stranger, action)).status).toBe(403);
        expect((await request(owner, action, channelIds[2])).status).toBe(403);
        expect((await request(owner, action, 'invalid')).status).toBe(400);
        expect(
          (await request(owner, action, channelIds[0], true, crypto.randomUUID())).status,
        ).toBe(404);
      }
      expect(playlistCalls).toHaveLength(0);
      expect((await request(owner, 'settings')).status).toBe(200);
      const job = { videoId: videos[0], channelId: channelIds[0], creatorId: profileIds[0] };
      await store.enqueue([job]);
      expect(await store.claim(videos[0])).toBeNull();
      expect((await db.select().from(jobs).where(eq(jobs.videoId, videos[0])))[0].attempts).toBe(0);
      // Both requests race on the same database lock; exactly one calls the provider.
      const responses = await Promise.all([request(owner, 'fetch'), request(owner, 'fetch')]);
      expect(responses.map(r => r.status).sort()).toEqual([200, 429]);
      expect((await responses.find(r => r.status === 200)!.json()).data).toEqual({
        enqueued: 2,
        incomplete: false,
      });
      expect(playlistCalls).toEqual([[channelIds[0]]]);
      expect(uploadCalls).toEqual([channelIds[0]]);
      expect(handleCalls).toBe(0);
      expect(await db.select().from(jobs).where(eq(jobs.videoId, videos[2]))).toHaveLength(0);
      // Manual fetch overrides only this batch, leaving the channel paused.
      const manualJob = (await store.claim(videos[0]))!;
      expect(manualJob.manuallyRequested).toBe(true);
      await assertChannelImportAllowed(db, manualJob);
      expect(await store.publish(manualJob, document(videos[0]), true, [])).toBe('published');
      expect(
        (
          await db
            .select()
            .from(creatorYoutubeChannel)
            .where(eq(creatorYoutubeChannel.channelId, channelIds[0]))
        )[0].autoImportEnabled,
      ).toBe(false);
      await resetCooldown();
      expect(await controls.fetchNew(profileIds[0], owner, channelIds[0])).toEqual({
        enqueued: 0,
        incomplete: false,
      });
      // Pausing after a claim prevents publication and returns the job without consuming attempts.
      await controls.setAutoImport(profileIds[0], owner, channelIds[0], true);
      await store.enqueue([{ ...job, videoId: videos[3] }]);
      const inFlight = (await store.claim(videos[3]))!;
      await controls.setAutoImport(profileIds[0], owner, channelIds[0], false);
      await expect(assertChannelImportAllowed(db, inFlight)).rejects.toThrow('auto_import_paused');
      await expect(store.publish(inFlight, document(videos[3]), true, [])).rejects.toThrow(
        'auto_import_paused',
      );
      expect(
        await db.select().from(creation).where(eq(creation.sourceVideoId, videos[3])),
      ).toHaveLength(0);
      expect(await store.fail(inFlight, new WorkerError('auto_import_paused'))).toMatchObject({
        count: 'waiting',
        update: { attempts: 0, status: 'pending' },
      });
      expect(await store.claim(videos[3])).toBeNull();
      await controls.setAutoImport(profileIds[0], owner, channelIds[0], true);
      expect(await store.claim(videos[3])).not.toBeNull();
      // Edits are granular, sticky, revision-checked and private to the editor DTO.
      const [imported] = await db
        .select()
        .from(creation)
        .where(eq(creation.sourceVideoId, videos[0]));
      expect(imported.manuallyEditedFields).toEqual([]);
      let saved = await creations.save(
        profileIds[0],
        editor,
        { ...imported.draft, title: 'My title', chapters: [{ title: 'Start', startSeconds: 0 }] },
        imported.id,
        1,
      );
      expect((await creations.get(imported.id, editor, true)).manuallyEditedFields).toEqual([
        'title',
        'chapters',
      ]);
      expect((await creations.get(imported.id)).manuallyEditedFields).toBeUndefined();
      expect((await creations.get(imported.id)).document.title).toBe(imported.draft.title);
      await expect(
        creations.save(profileIds[0], owner, { ...imported.draft, language: 'de' }, imported.id, 1),
      ).rejects.toThrow('This draft changed');
      saved = await creations.save(
        profileIds[0],
        owner,
        { ...imported.draft, tags: ['purpose:deck-guide'] },
        imported.id,
        saved.revision,
      );
      expect((await creations.get(imported.id, owner, true)).manuallyEditedFields).toEqual([
        'title',
        'chapters',
        'tags',
      ]);
      await creations.save(
        profileIds[0],
        owner,
        { ...imported.draft, tags: ['purpose:deck-guide'] },
        imported.id,
        saved.revision,
      );
      expect((await creations.get(imported.id, owner, true)).manuallyEditedFields).toEqual([
        'title',
        'chapters',
        'tags',
      ]);
      // Losing OAuth while YouTube is responding does not stop public discovery.
      await resetCooldown();
      onUpload = async () => {
        await db.delete(creatorYoutube).where(eq(creatorYoutube.channelId, channelIds[0]));
      };
      expect((await request(owner, 'fetch')).status).toBe(200);
      onUpload = async () => {};
      await db.insert(creatorYoutube).values({
        channelId: channelIds[0],
        creatorId: profileIds[0],
        accessToken: 'fixture',
        expiresAt: new Date().toISOString(),
      });
      // Interactive discovery is bounded and reports an incomplete scan rather than claiming success.
      await resetCooldown();
      nextPageToken = 'more';
      playlistCalls = [];
      uploadCalls = [];
      expect(await controls.fetchNew(profileIds[0], owner, channelIds[0])).toMatchObject({
        incomplete: true,
      });
      expect(uploadCalls).toHaveLength(3);
      // Missing playlists preserve the empty/incomplete API response and manual cooldown.
      for (const missingPage of [0, 1]) {
        await resetCooldown();
        let pages = 0;
        onUpload = async () => {
          if (pages++ === missingPage) throw new WorkerError('youtube_http_404', false);
        };
        const response = await request(owner, 'fetch');
        expect(response.status).toBe(200);
        expect((await response.json()).data).toEqual({
          enqueued: 0,
          incomplete: missingPage > 0,
        });
        expect((await request(owner, 'fetch')).status).toBe(429);
      }
      // Provider failures are safe, retryable UI errors; they retain the per-channel cooldown.
      await resetCooldown();
      onUpload = async () => {
        throw new Error('secret-provider-message');
      };
      const failure = await request(owner, 'fetch');
      expect(failure.status).toBe(503);
      expect(await failure.text()).not.toContain('secret-provider-message');
      expect((await request(owner, 'fetch')).status).toBe(429);
      // Scoped discovery still detects ownership conflicts and never follows a forged creator ID.
      await expect(
        createVideoDiscovery(db, () => api)(undefined, {
          channelId: channelIds[0],
          creatorId: profileIds[1],
        }),
      ).rejects.toThrow('channel_no_longer_eligible');
    } finally {
      await db.delete(creatorProfile).where(inArray(creatorProfile.id, profileIds));
      await db
        .delete(creatorYoutubeChannel)
        .where(inArray(creatorYoutubeChannel.channelId, channelIds));
      await db.delete(user).where(inArray(user.id, [owner, editor, stranger]));
    }
  },
  30_000,
);

test.skipIf(process.env.CREATOR_HUB_DB_TEST !== '1')(
  'historical manual edit migration preserves existing flags and untouched videos',
  async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_'))
      throw new Error('Use an isolated worktree database.');
    const migration = await creatorMigrationSection('protect_existing_video_edits');
    await db.transaction(async tx => {
      await tx.execute(
        sql.raw(`CREATE TEMP TABLE creation (id int, source_video_id text, revision int, draft jsonb, manually_edited_fields jsonb DEFAULT '[]') ON COMMIT DROP;
      INSERT INTO creation VALUES (1, 'imported', 2, '{"title":"Edited","tags":[]}', '[]'),
      (2, 'untouched', 1, '{"title":"Original"}', '[]'), (3, NULL, 2, '{"title":"Article"}', '[]'),
      (4, 'tracked', 3, '{"title":"Tracked","tags":[]}', '["title"]');`),
      );
      await tx.execute(sql.raw(migration));
      await tx.execute(sql.raw(migration));
      const rows = await tx.execute(
        sql`SELECT manually_edited_fields AS fields FROM creation ORDER BY id`,
      );
      expect(rows.map(r => r.fields)).toEqual([['tags', 'title'], [], [], ['title']]);
    });
  },
);
