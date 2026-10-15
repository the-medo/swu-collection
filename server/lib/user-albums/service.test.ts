import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { userFile, userFileStorage } from '../../db/schema/user_file.ts';
import { userAlbum, userAlbumItem } from '../../db/schema/user_album.ts';
import { createUserAlbumService } from './service.ts';
import { createUserFileService } from '../user-files/service.ts';
import { UserFileError } from '../user-files/errors.ts';
import { createUserAlbumsRoute } from '../../routes/user-albums.ts';
import type { AuthExtension } from '../../auth/auth.ts';
import { createUserAlbumInput } from '../../../types/UserAlbum.ts';

test.skipIf(process.env.USER_ALBUMS_DB_TEST !== '1')(
  'album access, membership, order, quota, deletion and concurrent writes',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Select an isolated worktree database.');
    const owners = ['a', 'b'].map(suffix => `album-test-${crypto.randomUUID()}-${suffix}`);
    let failRemove = false;
    const objects = new Map<string, Uint8Array>();
    const storage = {
      available: () => true,
      publicUrl: (key: string) => `https://images.example.com/${key}`,
      async put(key: string, bytes: Uint8Array) {
        objects.set(key, bytes);
      },
      async remove(key: string) {
        if (failRemove) throw new UserFileError('Try again.', 502);
        objects.delete(key);
      },
    };
    const service = createUserAlbumService(storage);
    const uploads = createUserFileService(storage);
    let viewer: string | null = owners[0];
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        c.set(
          'user',
          viewer ? ({ id: viewer } as NonNullable<AuthExtension['Variables']['user']>) : null,
        );
        await next();
      })
      .route('/api/user-albums', createUserAlbumsRoute(service));
    const request = (path = '', method = 'GET', body?: unknown, originHeader = true) =>
      app.request(`/api/user-albums${path}`, {
        method,
        headers: {
          ...(originHeader ? { 'X-Requested-With': 'swubase' } : {}),
          'Content-Type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    try {
      await db.insert(user).values(
        owners.map(id => ({
          id,
          name: 'Album fixture',
          displayName: id,
          email: `${id}@invalid.local`,
          emailVerified: false,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      const fileIds = Array.from({ length: 26 }, () => crypto.randomUUID());
      await db.insert(userFile).values(
        fileIds.map((id, index) => ({
          id,
          userId: index === 25 ? owners[1] : owners[0],
          fileName: 'private-filename.png',
          imageKey: `${id}.webp`,
          thumbnailKey: `${id}-thumb.webp`,
          originalByteSize: 20,
          byteSize: 10,
          thumbnailByteSize: 2,
          width: 20,
          height: 10,
        })),
      );
      const initialUsage = (await uploads.list(owners[0], 0)).usedBytes;
      expect(initialUsage).toBe(300);
      expect((await uploads.list(owners[0], 0)).quotaBytes).toBe(100_000_000);
      const created = await request('', 'POST', { title: 'My album' });
      expect(created.status).toBe(201);
      const { id } = (await created.json()).data;
      const read = () => service.read(id, owners[0], 0);
      expect((await read()).album.visibility).toBe('unlisted');
      const [defaultAlbum] = await db
        .insert(userAlbum)
        .values({ userId: owners[0], title: 'DB default' })
        .returning();
      expect(defaultAlbum.visibility).toBe('unlisted');
      expect((await request('', 'POST', { title: ' ' })).status).toBe(400);
      expect((await request('', 'POST', { title: 'x', userId: owners[1] })).status).toBe(400);
      expect((await request('', 'POST', { title: 'x' }, false)).status).toBe(403);
      expect((await request('/invalid')).status).toBe(400);
      expect((await request('?page=-1')).status).toBe(400);
      let result = await service.addImages(owners[0], id, {
        revision: 0,
        fileIds: fileIds.slice(0, 25),
      });
      const first = await read();
      expect(first.images).toHaveLength(12);
      expect(first.album.imageCount).toBe(25);
      expect(first.album.cover?.fileId).toBe(fileIds[0]);
      const second = await service.read(id, undefined, 1, result.revision);
      const third = await service.read(id, undefined, 2, result.revision);
      expect(second.images).toHaveLength(12);
      expect(third.images).toHaveLength(1);
      expect(third.hasMore).toBe(false);
      expect(
        new Set([...first.images, ...second.images, ...third.images].map(i => i.fileId)).size,
      ).toBe(25);
      expect(JSON.stringify(first)).not.toMatch(
        /private-filename|imageKey|thumbnailKey|quotaBytes|usedBytes/,
      );
      expect(
        await service.addImages(owners[0], id, {
          revision: result.revision,
          fileIds: [fileIds[0], fileIds[0]],
        }),
      ).toEqual(result);
      await expect(
        service.addImages(owners[0], id, {
          revision: result.revision,
          fileIds: [fileIds[0], fileIds[25]],
        }),
      ).rejects.toMatchObject({ status: 400 });
      expect((await read()).album.imageCount).toBe(25);
      expect((await uploads.list(owners[0], 0)).usedBytes).toBe(initialUsage);
      await expect(
        service.update(owners[0], id, { revision: result.revision, coverFileId: fileIds[25] }),
      ).rejects.toMatchObject({ status: 400 });
      result = await service.update(owners[0], id, {
        revision: result.revision,
        coverFileId: fileIds[1],
      });
      expect((await read()).album.cover?.fileId).toBe(fileIds[1]);
      result = await service.updateImage(owners[0], id, fileIds[12], {
        revision: result.revision,
        move: { type: 'earlier' },
        caption: 'Caption',
        altText: 'Description',
      });
      expect((await read()).images[11]).toMatchObject({
        fileId: fileIds[12],
        caption: 'Caption',
        altText: 'Description',
      });
      result = await service.updateImage(owners[0], id, fileIds[12], {
        revision: result.revision,
        move: { type: 'before', fileId: fileIds[0] },
      });
      expect((await read()).images[0].fileId).toBe(fileIds[12]);
      result = await service.updateImage(owners[0], id, fileIds[12], {
        revision: result.revision,
        move: { type: 'later' },
      });
      expect((await read()).images[1].fileId).toBe(fileIds[12]);
      await expect(service.read(id, undefined, 1, 0)).rejects.toMatchObject({ status: 409 });
      result = await service.removeImage(owners[0], id, fileIds[1], result.revision);
      expect((await read()).album.coverFileId).toBeNull();
      expect((await uploads.list(owners[0], 0)).usedBytes).toBe(initialUsage);
      const other = await service.create(
        owners[0],
        createUserAlbumInput.parse({ title: 'Other', visibility: 'public' }),
      );
      let otherResult = await service.addImages(owners[0], other.id, {
        revision: other.revision,
        fileIds: [fileIds[0]],
      });
      otherResult = await service.update(owners[0], other.id, {
        revision: otherResult.revision,
        coverFileId: fileIds[0],
      });
      expect((await service.membership(owners[0], [fileIds[0]])).length).toBe(2);
      expect((await uploads.list(owners[0], 0)).usedBytes).toBe(initialUsage);
      await db
        .update(userFileStorage)
        .set({ quotaBytes: 1 })
        .where(eq(userFileStorage.userId, owners[0]));
      result = await service.update(owners[0], id, {
        revision: result.revision,
        title: 'Organization at full quota',
        visibility: 'private',
      });
      viewer = null;
      expect((await request()).status).toBe(401);
      expect((await request('', 'POST', { title: 'x' })).status).toBe(401);
      const hidden = await request(`/${id}`);
      expect(hidden.status).toBe(404);
      expect(hidden.headers.get('Cache-Control')).toBe('private, no-store');
      expect((await request(`/${other.id}`)).status).toBe(200);
      expect((await request(`/by-user/${owners[0]}`)).status).toBe(200);
      expect((await service.list(owners[0], undefined, true)).albums.map(g => g.id)).toEqual([
        other.id,
      ]);
      viewer = owners[1];
      expect((await request(`/${id}`)).status).toBe(404);
      expect(
        (await request(`/${id}`, 'PATCH', { revision: result.revision, visibility: 'public' }))
          .status,
      ).toBe(404);
      expect(
        (
          await request(`/${id}/images`, 'POST', {
            revision: result.revision,
            fileIds: [fileIds[25]],
          })
        ).status,
      ).toBe(404);
      expect(
        (
          await request(`/${id}/images/${fileIds[0]}`, 'PATCH', {
            revision: result.revision,
            caption: 'x',
          })
        ).status,
      ).toBe(404);
      expect((await request(`/${id}`, 'DELETE', { revision: result.revision })).status).toBe(404);
      expect(await service.membership(owners[1], [fileIds[0]])).toEqual([]);
      viewer = owners[0];
      result = await service.update(owners[0], id, {
        revision: result.revision,
        visibility: 'unlisted',
      });
      const unlisted = await request(`/${id}`);
      expect(unlisted.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
      expect((await service.read(id, undefined, 0)).album.visibility).toBe('unlisted');
      const raced = await Promise.allSettled([
        service.update(owners[0], id, { revision: result.revision, title: 'First tab' }),
        service.update(owners[0], id, { revision: result.revision, title: 'Second tab' }),
      ]);
      expect(raced.filter(r => r.status === 'fulfilled')).toHaveLength(1);
      expect(raced.find(r => r.status === 'rejected')).toMatchObject({ reason: { status: 409 } });
      failRemove = true;
      await expect(uploads.remove(owners[0], fileIds[0])).rejects.toMatchObject({ status: 502 });
      expect(await service.membership(owners[0], [fileIds[0]])).toHaveLength(2);
      expect((await service.read(other.id, owners[0], 0)).album.revision).toBe(
        otherResult.revision,
      );
      expect((await uploads.list(owners[0], 0)).usedBytes).toBe(initialUsage);
      failRemove = false;
      await uploads.remove(owners[0], fileIds[0]);
      expect(await service.membership(owners[0], [fileIds[0]])).toHaveLength(0);
      expect((await service.read(other.id, owners[0], 0)).album).toMatchObject({
        cover: null,
        coverFileId: null,
        imageCount: 0,
        revision: otherResult.revision + 1,
      });
      expect((await uploads.list(owners[0], 0)).usedBytes).toBe(initialUsage - 12);
      const current = (await read()).album;
      const concurrentDelete = await Promise.allSettled([
        service.update(owners[0], id, { revision: current.revision, coverFileId: fileIds[2] }),
        uploads.remove(owners[0], fileIds[2]),
      ]);
      expect(concurrentDelete[1].status).toBe('fulfilled');
      expect((await read()).album.coverFileId).toBeNull();
      expect(await service.membership(owners[0], [fileIds[2]])).toHaveLength(0);
      await service.remove(owners[0], id, (await read()).album.revision);
      expect((await uploads.list(owners[0], 0)).usedBytes).toBe(initialUsage - 24);
      expect(
        await db.select().from(userAlbumItem).where(eq(userAlbumItem.albumId, id)),
      ).toHaveLength(0);
      await expect(read()).rejects.toMatchObject({ status: 404 });

      // Stable creation cursors survive edits and deletions between list pages,
      // including a page boundary with PostgreSQL's microsecond timestamp ties.
      const more = await db
        .insert(userAlbum)
        .values(
          Array.from({ length: 26 }, (_, index) => ({
            userId: owners[0],
            title: `Paged album ${index}`,
            visibility: 'public' as const,
          })),
        )
        .returning();
      const firstList = await service.list(owners[0], undefined, true);
      expect(firstList.albums).toHaveLength(12);
      const unseen = more.find(album => !firstList.albums.some(item => item.id === album.id))!;
      await service.update(owners[0], unseen.id, { revision: 0, title: 'Edited between pages' });
      const firstListed = firstList.albums[0];
      await service.remove(owners[0], firstListed.id, firstListed.revision);
      const insertedLater = await service.create(
        owners[0],
        createUserAlbumInput.parse({ title: 'Created between pages', visibility: 'public' }),
      );
      const collected = [...firstList.albums];
      let cursor = firstList.nextCursor;
      while (cursor) {
        const response = await request(
          `/by-user/${owners[0]}?${new URLSearchParams({ ...cursor })}`,
        );
        expect(response.status).toBe(200);
        const next = (await response.json()).data;
        collected.push(...next.albums);
        cursor = next.nextCursor;
      }
      expect(new Set(collected.map(album => album.id)).size).toBe(collected.length);
      expect(new Set(collected.map(album => album.id))).toEqual(
        new Set([...more.map(album => album.id), other.id]),
      );
      expect(collected.some(album => album.id === insertedLater.id)).toBe(false);
      expect((await request('?beforeId=' + more[0].id)).status).toBe(400);
    } finally {
      await db.delete(user).where(inArray(user.id, owners));
    }
  },
  30_000,
);

test.skipIf(process.env.USER_ALBUMS_DB_TEST !== '1')(
  'sanitizer removes albums with referencing FKs and supports older schemas',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Select an isolated worktree database.');
    const source = await Bun.file(
      new URL('../../../scripts/remote-dev/sql/001-core-data.sql', import.meta.url),
    ).text();
    const block = source.match(/DO \$user_albums\$[\s\S]*?\$user_albums\$;/)![0];
    for (const tableName of [undefined, 'user_album', 'user_gallery']) {
      const schemaName = `album_sanitizer_${crypto.randomUUID().replaceAll('-', '')}`;
      await db.transaction(async tx => {
        const schema = sql.identifier(schemaName);
        await tx.execute(sql`CREATE SCHEMA ${schema}`);
        await tx.execute(sql`SET LOCAL search_path TO ${schema}`);
        await tx.execute(
          sql`CREATE TABLE user_file (id text PRIMARY KEY); CREATE TABLE user_file_storage (secret text); INSERT INTO user_file VALUES ('image'); INSERT INTO user_file_storage VALUES ('quota')`,
        );
        if (tableName) {
          const table = sql.identifier(tableName);
          const items = sql.identifier(tableName + '_item');
          const column = sql.identifier(tableName === 'user_album' ? 'album_id' : 'gallery_id');
          await tx.execute(
            sql`CREATE TABLE ${table} (id text PRIMARY KEY, cover text REFERENCES user_file(id))`,
          );
          await tx.execute(
            sql`CREATE TABLE ${items} (${column} text REFERENCES ${table}(id), file_id text REFERENCES user_file(id))`,
          );
          await tx.execute(sql`INSERT INTO ${table} VALUES ('private title', 'image')`);
          await tx.execute(sql`INSERT INTO ${items} VALUES ('private title', 'image')`);
        }
        const isolate = (statement: string) =>
          statement
            .replaceAll('public.user_album', `${schemaName}.user_album`)
            .replaceAll('public.user_gallery', `${schemaName}.user_gallery`);
        await tx.execute(sql.raw(isolate(block)));
        expect((await tx.execute(sql`SELECT count(*)::int AS count FROM user_file`))[0].count).toBe(
          0,
        );
        if (tableName) {
          expect(
            (
              await tx.execute(sql`SELECT count(*)::int AS count FROM ${sql.identifier(tableName)}`)
            )[0].count,
          ).toBe(0);
          expect(
            (
              await tx.execute(
                sql`SELECT count(*)::int AS count FROM ${sql.identifier(tableName + '_item')}`,
              )
            )[0].count,
          ).toBe(0);
        }
        // Run the exact post-cleanup guard against this disposable schema.
        const guard = source.slice(
          source.lastIndexOf("  IF to_regclass('public.user_album')"),
          source.indexOf(
            "  IF to_regclass('public.image_gallery')",
            source.lastIndexOf("  IF to_regclass('public.user_album')"),
          ),
        );
        await tx.execute(sql.raw(`DO $$ BEGIN ${isolate(guard)} END $$;`));
        await tx.execute(sql`SET LOCAL search_path TO public`);
        await tx.execute(sql`DROP SCHEMA ${schema} CASCADE`);
      });
    }
  },
  30_000,
);
