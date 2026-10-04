import { expect, test } from 'bun:test';
import sharp from 'sharp';
import { Hono } from 'hono';
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { userFile, userFileStorage } from '../../db/schema/user_file.ts';
import { createUserFileService } from './service.ts';
import { createUserFilesRoute } from '../../routes/user-files.ts';
import { UserFileError } from './errors.ts';
import type { AuthExtension } from '../../auth/auth.ts';
import { defaultUserFileQuotaBytes, maxUserFileBytes } from '../../../types/UserFile.ts';

test.skipIf(process.env.USER_FILES_DB_TEST !== '1')(
  'upload lifecycle, isolation, public images, pagination, quota races and failure recovery',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Select an isolated worktree database.');
    const users = ['a', 'b'].map(suffix => `uploads-test-${crypto.randomUUID()}-${suffix}`);
    const objects = new Map<string, Uint8Array>();
    let failPut = false,
      failRemove = false,
      failDatabase = false;
    let puts = 0;
    const publicBaseUrl = 'https://images.example.com';
    const service = createUserFileService({
      available: () => true,
      publicUrl: key => `${publicBaseUrl}/${key}`,
      async put(key, body) {
        objects.set(key, body);
        puts++;
        if (failPut && key.includes('-thumb')) throw new UserFileError('Upload unavailable.', 502);
      },
      async remove(key) {
        if (failRemove) throw new UserFileError('Delete unavailable.', 502);
        objects.delete(key);
      },
    });
    let account: string | null = users[0];
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        if (account)
          c.set('user', { id: account } as NonNullable<AuthExtension['Variables']['user']>);
        await next();
      })
      .route(
        '/api/user-files',
        createUserFilesRoute({
          ...service,
          async list(userId, page) {
            if (failDatabase) throw new Error('SQL private filename');
            return service.list(userId, page);
          },
        }),
      );
    const request = (path = '', method = 'GET') =>
      app.request(`/api/user-files${path}`, { method, headers: { 'X-Requested-With': 'swubase' } });
    const input = await sharp({
      create: { width: 800, height: 400, channels: 3, background: '#abcdef' },
    })
      .png()
      .toBuffer();
    const file = new File([new Uint8Array(input)], 'picture.png', { type: 'image/png' });
    const upload = async (image = file, extras = false) => {
      const form = new FormData();
      form.set('file', image);
      if (extras) form.set('userId', users[1]);
      const req = new Request('http://localhost/api/user-files', {
        method: 'POST',
        headers: { 'X-Requested-With': 'swubase' },
        body: form,
      });
      const body = await req.arrayBuffer();
      req.headers.set('Content-Length', String(body.byteLength));
      return app.request(req.url, { method: 'POST', headers: req.headers, body });
    };
    try {
      await db.insert(user).values(
        users.map(id => ({
          id,
          name: 'Uploads fixture',
          displayName: id,
          email: `${id}@invalid.local`,
          emailVerified: false,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      const empty = await request();
      expect(empty.headers.get('Cache-Control')).toBe('private, no-store');
      expect((await empty.json()).data).toMatchObject({
        files: [],
        usedBytes: 0,
        quotaBytes: defaultUserFileQuotaBytes,
        fileCount: 0,
      });
      expect((await request('?page=-1')).status).toBe(400);
      expect((await request('/invalid', 'DELETE')).status).toBe(400);
      expect((await upload(file, true)).status).toBe(400);
      expect((await app.request('/api/user-files', { method: 'POST' })).status).toBe(403);
      expect(
        (await upload(new File([new Uint8Array(maxUserFileBytes + 100_000)], 'large.png'))).status,
      ).toBe(413);
      expect((await upload(new File(['HTML'], 'fake.png', { type: 'image/png' }))).status).toBe(
        400,
      );
      failDatabase = true;
      const failure = await request();
      expect(failure.status).toBe(500);
      expect(await failure.text()).not.toContain('SQL private filename');
      failDatabase = false;
      const uploaded = await upload();
      expect(uploaded.status).toBe(201);
      const item = (await uploaded.json()).data;
      expect(item).not.toHaveProperty('userId');
      expect(item).not.toHaveProperty('imageKey');
      expect(item).not.toHaveProperty('thumbnailKey');
      expect(item).toMatchObject({ width: 800, height: 400, originalByteSize: input.length });
      const size = item.byteSize + item.thumbnailByteSize;
      expect((await service.list(users[0], 0)).usedBytes).toBe(size);
      expect(item.url).toBe(`${publicBaseUrl}/user-files/${users[0]}/${item.id}.webp`);
      expect(item.thumbnailUrl).toBe(
        `${publicBaseUrl}/user-files/${users[0]}/${item.id}-thumb.webp`,
      );
      expect((await db.select().from(userFile).where(eq(userFile.id, item.id)))[0]).toMatchObject({
        imageKey: `user-files/${users[0]}/${item.id}.webp`,
        thumbnailKey: `user-files/${users[0]}/${item.id}-thumb.webp`,
      });
      // Production gallery and new-upload responses must bypass the API for both sizes.
      const directList = (await (await request()).json()).data;
      expect(directList.files[0]).toMatchObject({
        url: `${publicBaseUrl}/user-files/${users[0]}/${item.id}.webp`,
        thumbnailUrl: `${publicBaseUrl}/user-files/${users[0]}/${item.id}-thumb.webp`,
      });
      const directUpload = (await (await upload()).json()).data;
      expect(directUpload.url).toBe(
        `${publicBaseUrl}/user-files/${users[0]}/${directUpload.id}.webp`,
      );
      expect(directUpload.thumbnailUrl).toBe(
        `${publicBaseUrl}/user-files/${users[0]}/${directUpload.id}-thumb.webp`,
      );
      // Previously copied API URLs still redirect to their public object.
      const legacyImage = await request(`/${item.id}/image`);
      expect(legacyImage.status).toBe(302);
      expect(legacyImage.headers.get('Location')).toBe(directList.files[0].url);
      const legacyThumbnail = await request(`/${item.id}/thumbnail`);
      expect(legacyThumbnail.headers.get('Location')).toBe(directList.files[0].thumbnailUrl);
      await service.remove(users[0], directUpload.id);
      account = users[1];
      expect((await service.list(users[1], 0)).files).toEqual([]);
      expect((await request(`/${item.id}`, 'DELETE')).status).toBe(404);
      account = null;
      expect((await request()).status).toBe(401);
      expect((await upload()).status).toBe(401);
      expect((await request(`/${item.id}`, 'DELETE')).status).toBe(401);
      const publicImage = await request(`/${item.id}/image`);
      expect(publicImage.status).toBe(302);
      expect(publicImage.headers.get('Location')).toBe(item.url);
      expect(
        await sharp(objects.get(`user-files/${users[0]}/${item.id}.webp`)!).metadata(),
      ).toMatchObject({
        width: 800,
        height: 400,
        format: 'webp',
      });
      expect((await request(`/${item.id}/thumbnail`)).status).toBe(302);
      expect((await request(`/${crypto.randomUUID()}/image`)).status).toBe(404);
      account = users[0];
      failRemove = true;
      expect((await request(`/${item.id}`, 'DELETE')).status).toBe(502);
      expect((await service.list(users[0], 0)).usedBytes).toBe(size);
      failRemove = false;
      expect((await request(`/${item.id}`, 'DELETE')).status).toBe(200);
      expect(objects.size).toBe(0);
      expect((await request(`/${item.id}/image`)).status).toBe(404);
      failPut = true;
      expect((await upload()).status).toBe(502);
      expect(objects.size).toBe(0);
      expect((await service.list(users[0], 0)).usedBytes).toBe(0);
      failPut = false;
      // Legacy paths and future independent thumbnail locations use persisted keys everywhere.
      const legacyId = crypto.randomUUID();
      for (const keys of [
        {
          imageKey: `user-files/${legacyId}.webp`,
          thumbnailKey: `user-files/${legacyId}-thumb.webp`,
        },
        {
          imageKey: `user-files/${users[0]}/custom/image.webp`,
          thumbnailKey: `user-files/${users[0]}/previews/custom.webp`,
        },
      ]) {
        await db.insert(userFile).values({
          id: legacyId,
          userId: users[0],
          fileName: 'legacy.png',
          ...keys,
          originalByteSize: 2,
          byteSize: 1,
          thumbnailByteSize: 1,
          width: 100,
          height: 100,
        });
        for (const key of Object.values(keys)) objects.set(key, new Uint8Array([1]));
        const legacy = (await service.list(users[0], 0)).files[0];
        expect(legacy.url).toBe(`${publicBaseUrl}/${keys.imageKey}`);
        expect(legacy.thumbnailUrl).toBe(`${publicBaseUrl}/${keys.thumbnailKey}`);
        expect((await request(`/${legacyId}/image`)).headers.get('Location')).toBe(legacy.url);
        expect((await request(`/${legacyId}/thumbnail`)).headers.get('Location')).toBe(
          legacy.thumbnailUrl,
        );
        await expect(service.remove(users[1], legacyId)).rejects.toMatchObject({ status: 404 });
        expect(objects.size).toBe(2);
        await service.remove(users[0], legacyId);
        expect(objects.size).toBe(0);
        expect((await service.list(users[0], 0)).usedBytes).toBe(0);
      }
      // Exactly one image fits. Simultaneous requests must not both pass the quota check.
      await db
        .update(userFileStorage)
        .set({ quotaBytes: size })
        .where(eq(userFileStorage.userId, users[0]));
      const concurrent = await Promise.all([upload(), upload()]);
      expect(concurrent.map(r => r.status).sort()).toEqual([201, 429]);
      for (const entry of (await service.list(users[0], 0)).files)
        await service.remove(users[0], entry.id);
      // Bypass process admission to model requests served by different replicas.
      const race = await Promise.allSettled([
        service.create(users[0], file),
        service.create(users[0], file),
      ]);
      expect(race.filter(result => result.status === 'fulfilled')).toHaveLength(1);
      expect(race.find(result => result.status === 'rejected')).toMatchObject({
        reason: { status: 409 },
      });
      const listed = await service.list(users[0], 0);
      expect(listed.usedBytes).toBe(size);
      expect(listed.files).toHaveLength(1);
      const previousPuts = puts;
      expect((await upload()).status).toBe(409);
      expect(puts).toBe(previousPuts);
      // An operator can increase one account's allowance without changing other users.
      await db
        .update(userFileStorage)
        .set({ quotaBytes: size * 2 })
        .where(eq(userFileStorage.userId, users[0]));
      expect((await upload()).status).toBe(201);
      expect((await service.list(users[1], 0)).quotaBytes).toBe(defaultUserFileQuotaBytes);
      // Lowering the limit keeps existing files accessible and deletable.
      await db
        .update(userFileStorage)
        .set({ quotaBytes: 0 })
        .where(eq(userFileStorage.userId, users[0]));
      expect((await upload()).status).toBe(409);
      for (const entry of (await service.list(users[0], 0)).files)
        await service.remove(users[0], entry.id);
      expect(objects.size).toBe(0);
      expect((await service.list(users[0], 0)).usedBytes).toBe(0);
      await db.insert(userFile).values(
        Array.from({ length: 25 }, (_, index) => ({
          userId: users[0],
          fileName: `${index}.png`,
          imageKey: `user-files/${users[0]}/pagination-${index}.webp`,
          thumbnailKey: `user-files/${users[0]}/pagination-${index}-thumb.webp`,
          originalByteSize: 2,
          byteSize: 1,
          thumbnailByteSize: 1,
          width: 1,
          height: 1,
          createdAt: new Date(2026, 0, index + 1).toISOString(),
        })),
      );
      const page1 = await service.list(users[0], 0),
        page2 = await service.list(users[0], 1),
        page3 = await service.list(users[0], 2);
      expect(page1.files).toHaveLength(12);
      expect(page1.hasMore).toBe(true);
      expect(page1.files[0].fileName).toBe('24.png');
      expect(page2.files).toHaveLength(12);
      expect(page2.hasMore).toBe(true);
      expect(page2.files[0].fileName).toBe('12.png');
      expect(page3.files).toHaveLength(1);
      expect(page3.hasMore).toBe(false);
      expect(page3.files[0].fileName).toBe('0.png');
      expect(
        new Set([...page1.files, ...page2.files, ...page3.files].map(file => file.id)).size,
      ).toBe(25);
      expect(page1.fileCount).toBe(25);
      // Execute the production sanitizer's exact upload cleanup and assertion against temp fixtures.
      const sanitizer = await Bun.file(
        new URL('../../../scripts/remote-dev/sql/001-core-data.sql', import.meta.url),
      ).text();
      const cleanup = sanitizer.match(/TRUNCATE TABLE user_file, user_file_storage;/)![0];
      const assertion = sanitizer.match(/IF EXISTS \(SELECT 1 FROM user_file\)[\s\S]*?END IF;/)![0];
      await db.transaction(async tx => {
        await tx.execute(sql`CREATE TEMP TABLE user_file (secret text) ON COMMIT DROP`);
        await tx.execute(sql`CREATE TEMP TABLE user_file_storage (secret text) ON COMMIT DROP`);
        await tx.execute(sql`INSERT INTO user_file VALUES ('private filename')`);
        await tx.execute(sql`INSERT INTO user_file_storage VALUES ('supporter entitlement')`);
        await tx.execute(sql.raw(cleanup));
        await tx.execute(sql.raw(`DO $$ BEGIN ${assertion} END $$;`));
      });
    } finally {
      await db.delete(user).where(inArray(user.id, users));
    }
  },
  30_000,
);
