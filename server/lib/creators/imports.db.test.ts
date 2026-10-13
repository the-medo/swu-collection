import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { user } from '../../db/schema/auth-schema.ts';
import {
  creatorProfile,
  creatorYoutubeChannel,
  creatorChannel,
} from '../../db/schema/creator_hub.ts';
import { creatorVideoJob, creatorChannelResolution } from '../../db/schema/creator_video_job.ts';
import { createCreatorImportService } from './imports.ts';
import { createCreatorImportRouter } from '../../routes/admin/creator-imports/index.ts';
import { creatorImportSchema, MAX_CREATOR_IMPORT_BYTES } from '../../../shared/creators/imports.ts';
import type { AuthExtension } from '../../auth/auth.ts';

test.skipIf(process.env.CREATOR_HUB_DB_TEST !== '1')(
  'admin imports are transactional, previewed, idempotent, and preserve channel/ownership controls',
  async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_'))
      throw new Error('Use an isolated worktree database.');
    const random = () => crypto.randomUUID().replaceAll('-', '');
    const prefix = `import-${random()}`;
    const admin = `${prefix}-admin`,
      regular = `${prefix}-user`;
    const channels = Array.from({ length: 5 }, () => `UC${random().slice(0, 22)}`);
    const videos = Array.from({ length: 4 }, () => random().slice(0, 11));
    const slugs = Array.from({ length: 4 }, (_, i) => `${prefix}-${i}`);
    const service = createCreatorImportService();
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        const id = c.req.header('x-fixture-user');
        // Deliberately claim admin in the session; requireAdmin must still check database roles.
        c.set(
          'user',
          id ? ({ id, role: 'admin' } as NonNullable<AuthExtension['Variables']['user']>) : null,
        );
        await next();
      })
      .route('/', createCreatorImportRouter(service));
    const request = (actor: string | null, path: string, body: unknown, csrf = true) =>
      app.request(path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(actor ? { 'x-fixture-user': actor } : {}),
          ...(csrf ? { 'X-Requested-With': 'swubase' } : {}),
        },
        body: JSON.stringify(body),
      });
    const input = creatorImportSchema.parse({
      kind: 'swubase-creator-import',
      schemaVersion: 1,
      creators: [
        {
          slug: slugs[0],
          name: 'Import fixture',
          bio: 'First line\nSecond line',
          languages: ['en'],
          specialties: [],
          links: channels.slice(0, 2).map((id, i) => ({
            label: `YouTube ${i}`,
            url: `https://www.youtube.com/channel/${id}`,
          })),
        },
      ],
      videos: [{ videoId: videos[0], channelId: channels[0] }],
    });
    const identities = sql`SELECT (SELECT count(*) FROM "user") AS users, (SELECT count(*) FROM account) AS accounts,
    (SELECT count(*) FROM creator_member) AS memberships, (SELECT count(*) FROM creator_youtube) AS oauth`;
    try {
      await db.insert(user).values(
        [admin, regular].map(id => ({
          id,
          name: 'Import test',
          displayName: id,
          email: `${id}@invalid.local`,
          emailVerified: false,
          role: id === admin ? 'admin' : 'user',
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      for (const path of ['/preview', '/apply']) {
        expect((await request(null, path, {})).status).toBe(401);
        expect((await request(regular, path, {})).status).toBe(403);
        expect((await request(admin, path, {}, false)).status).toBe(403);
      }
      expect((await request(admin, '/preview', { ...input, ownerId: admin })).status).toBe(400);
      expect(
        (await request(admin, '/preview', { padding: 'x'.repeat(MAX_CREATOR_IMPORT_BYTES + 1024) }))
          .status,
      ).toBe(413);
      const before = await db.execute(identities);
      const response = await request(admin, '/preview', input);
      expect(response.status).toBe(200);
      const preview = (await response.json()).data;
      expect(preview.summary).toEqual({ profiles: 1, queued: 1, skipped: 0, conflicts: 0 });
      expect(
        await db.select().from(creatorProfile).where(eq(creatorProfile.slug, slugs[0])),
      ).toHaveLength(0);
      const result = await request(admin, '/apply', {
        payload: input,
        fingerprint: preview.fingerprint,
      });
      expect(result.status).toBe(200);
      expect((await result.json()).data).toEqual({ profiles: 1, queued: 1, skipped: 0 });
      const [profile] = await db
        .select()
        .from(creatorProfile)
        .where(eq(creatorProfile.slug, slugs[0]));
      expect(profile.ownerId).toBeNull();
      expect(profile.profile.bio.blocks[0]).toMatchObject({
        content: [{ text: 'First line\nSecond line' }],
      });
      expect(
        await db.select().from(creatorChannel).where(eq(creatorChannel.creatorId, profile.id)),
      ).toHaveLength(2);
      expect(await db.execute(identities)).toEqual(before);
      expect(
        (await request(admin, '/apply', { payload: input, fingerprint: preview.fingerprint }))
          .status,
      ).toBe(409);
      await db
        .update(creatorProfile)
        .set({ profile: { ...profile.profile, name: 'Manually edited' }, revision: 2 })
        .where(eq(creatorProfile.id, profile.id));
      const repeated = await service.preview(input);
      expect(repeated.summary).toEqual({ profiles: 0, queued: 0, skipped: 2, conflicts: 0 });
      await service.apply(input, repeated.fingerprint);
      expect(
        (await db.select().from(creatorProfile).where(eq(creatorProfile.id, profile.id)))[0]
          .revision,
      ).toBe(2);
      expect(
        (await db.select().from(creatorProfile).where(eq(creatorProfile.id, profile.id)))[0].profile
          .name,
      ).toBe('Manually edited');
      const conflict = { ...input, creators: [{ ...input.creators[0], slug: slugs[1] }] };
      const blocked = await service.preview(conflict);
      expect(blocked.summary.conflicts).toBe(1);
      await expect(service.apply(conflict, blocked.fingerprint)).rejects.toThrow(
        'Resolve the conflicts',
      );
      const mixed = {
        ...input,
        creators: [
          {
            ...input.creators[0],
            slug: slugs[2],
            links: [
              {
                label: 'YouTube',
                url: `https://www.youtube.com/channel/${channels[2]}`,
                kind: 'social' as const,
              },
            ],
          },
        ],
        videos: [{ videoId: videos[1], channelId: channels[3] }],
      };
      const mixedPlan = await service.preview(mixed);
      expect(mixedPlan.summary).toMatchObject({ profiles: 1, conflicts: 1 });
      await expect(service.apply(mixed, mixedPlan.fingerprint)).rejects.toThrow(
        'Resolve the conflicts',
      );
      expect(
        await db.select().from(creatorProfile).where(eq(creatorProfile.slug, slugs[2])),
      ).toHaveLength(0);
      const queue = {
        ...input,
        creators: [],
        videos: [{ videoId: videos[2], channelId: channels[0] }],
      };
      const queuePlan = await service.preview(queue);
      await db
        .update(creatorYoutubeChannel)
        .set({ autoImportEnabled: false })
        .where(eq(creatorYoutubeChannel.channelId, channels[0]));
      await expect(service.apply(queue, queuePlan.fingerprint)).rejects.toThrow('changed');
      expect((await service.preview(queue)).summary).toMatchObject({ queued: 0, skipped: 1 });
      await db
        .update(creatorYoutubeChannel)
        .set({ autoImportEnabled: true })
        .where(eq(creatorYoutubeChannel.channelId, channels[0]));
      await db
        .update(creatorProfile)
        .set({ ownerId: regular })
        .where(eq(creatorProfile.id, profile.id));
      expect((await service.preview(queue)).summary.conflicts).toBe(1); // Owned profiles require OAuth, not public links.
      const ownedPlan = await service.preview(input);
      await service.apply(input, ownedPlan.fingerprint);
      expect(
        (await db.select().from(creatorProfile).where(eq(creatorProfile.id, profile.id)))[0]
          .ownerId,
      ).toBe(regular);
      // A resolved handle may be known before the worker creates a canonical association.
      const handle = `https://www.youtube.com/@ImportFixture-${random()}`;
      await db
        .insert(creatorProfile)
        .values({
          slug: slugs[3],
          ownerId: null,
          profile: {
            ...profile.profile,
            slug: slugs[3],
            links: [{ label: 'YouTube', url: handle, kind: 'social' }],
          },
        });
      await db.insert(creatorChannelResolution).values({ url: handle, channelId: channels[4] });
      const cachedHandle = {
        ...input,
        videos: [],
        creators: [
          {
            ...input.creators[0],
            slug: slugs[1],
            links: [
              {
                label: 'YouTube',
                url: `https://www.youtube.com/channel/${channels[4]}`,
                kind: 'social' as const,
              },
            ],
          },
        ],
      };
      const cachedPlan = await service.preview(cachedHandle);
      expect(cachedPlan.summary.conflicts).toBe(1);
      await expect(service.apply(cachedHandle, cachedPlan.fingerprint)).rejects.toThrow(
        'Resolve the conflicts',
      );
      expect(
        await db.select().from(creatorProfile).where(eq(creatorProfile.slug, slugs[1])),
      ).toHaveLength(0);

      // A channel retains its paused setting even after an old profile is removed.
      await db
        .insert(creatorYoutubeChannel)
        .values({ channelId: channels[3], autoImportEnabled: false });
      const pausedNew = {
        ...cachedHandle,
        creators: [
          {
            ...cachedHandle.creators[0],
            links: [
              {
                label: 'YouTube',
                url: `https://www.youtube.com/channel/${channels[3]}`,
                kind: 'social' as const,
              },
            ],
          },
        ],
        videos: [{ videoId: videos[1], channelId: channels[3] }],
      };
      expect((await service.preview(pausedNew)).summary).toEqual({
        profiles: 1,
        queued: 0,
        skipped: 1,
        conflicts: 0,
      });
      const concurrent = { ...mixed, videos: [{ videoId: videos[3], channelId: channels[2] }] };
      const concurrentPlan = await service.preview(concurrent);
      const attempts = await Promise.allSettled([
        service.apply(concurrent, concurrentPlan.fingerprint),
        service.apply(concurrent, concurrentPlan.fingerprint),
      ]);
      expect(attempts.filter(r => r.status === 'fulfilled')).toHaveLength(1);
      expect(
        await db.select().from(creatorProfile).where(eq(creatorProfile.slug, slugs[2])),
      ).toHaveLength(1);
      expect(
        await db.select().from(creatorVideoJob).where(eq(creatorVideoJob.videoId, videos[3])),
      ).toHaveLength(1);
    } finally {
      await db
        .delete(creatorChannelResolution)
        .where(inArray(creatorChannelResolution.channelId, channels));
      await db.delete(creatorProfile).where(inArray(creatorProfile.slug, slugs));
      await db
        .delete(creatorYoutubeChannel)
        .where(inArray(creatorYoutubeChannel.channelId, channels));
      await db.delete(user).where(inArray(user.id, [admin, regular]));
    }
  },
);
