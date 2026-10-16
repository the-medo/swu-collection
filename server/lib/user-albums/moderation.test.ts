import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { tournament } from '../../db/schema/tournament.ts';
import { tournamentType } from '../../db/schema/tournament_type.ts';
import { format } from '../../db/schema/format.ts';
import { userFile } from '../../db/schema/user_file.ts';
import { userAlbum } from '../../db/schema/user_album.ts';
import { createUserAlbumService } from './service.ts';
import { createUserAlbumsRoute } from '../../routes/user-albums.ts';
import { createAlbumModerationRoute } from '../../routes/admin/user-albums/index.ts';
import type { AuthExtension } from '../../auth/auth.ts';

test.skipIf(process.env.USER_ALBUMS_DB_TEST !== '1')(
  'admin event moderation persists across owner edits, protects permissions and restores explicitly',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Select an isolated worktree database.');
    const owner = `album-owner-${crypto.randomUUID()}`;
    const admin = `album-admin-${crypto.randomUUID()}`;
    const events = [crypto.randomUUID(), crypto.randomUUID()];
    const service = createUserAlbumService({
      publicUrl: key => `https://images.example.com/${key}`,
    });
    let viewer: string | null = admin;
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        c.set(
          'user',
          viewer ? ({ id: viewer } as NonNullable<AuthExtension['Variables']['user']>) : null,
        );
        await next();
      })
      .route('/admin', createAlbumModerationRoute(service))
      .route('/albums', createUserAlbumsRoute(service));
    const request = (path: string, body?: unknown, method = body ? 'POST' : 'GET', csrf = true) =>
      app.request(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(csrf ? { 'X-Requested-With': 'swubase' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    try {
      await db.insert(user).values(
        [owner, admin].map(id => ({
          id,
          name: id,
          displayName: id,
          email: `${id}@invalid.local`,
          emailVerified: false,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
          role: id === admin ? 'admin' : 'user',
        })),
      );
      const [kind] = await db.select().from(tournamentType).limit(1);
      const [gameFormat] = await db.select().from(format).limit(1);
      await db.insert(tournament).values(
        events.map(id => ({
          id,
          userId: owner,
          type: kind.id,
          format: gameFormat.id,
          name: 'Moderation event',
          location: 'FR',
          continent: 'Europe',
          attendance: 32,
          days: 1,
          date: new Date('2026-10-15'),
        })),
      );
      const fileId = crypto.randomUUID();
      await db.insert(userFile).values({
        id: fileId,
        userId: owner,
        fileName: 'Event.png',
        imageKey: `${owner}/image.webp`,
        thumbnailKey: `${owner}/thumb.webp`,
        originalByteSize: 100,
        byteSize: 80,
        thumbnailByteSize: 20,
        width: 100,
        height: 100,
      });
      let album = await service.create(owner, {
        title: 'Event memories',
        description: '',
        visibility: 'public',
        tournamentId: events[0],
      });
      album = await service.addImages(owner, album.id, {
        revision: album.revision,
        fileIds: [fileId],
      });
      const path = `/admin/${album.id}/event-link`;
      const decision = { revision: album.revision, blocked: true };
      for (const [actor, status] of [
        [null, 401],
        [owner, 403],
      ] as const) {
        viewer = actor;
        expect((await request('/admin/blocked')).status).toBe(status);
        expect((await request(path, decision)).status).toBe(status);
        expect((await request(path, { ...decision, blocked: false })).status).toBe(status);
      }
      viewer = admin;
      expect((await request('/admin/blocked?beforeId=' + album.id)).status).toBe(400);
      expect((await request('/admin/not-an-id/event-link', decision)).status).toBe(400);
      expect((await request(path, { ...decision, blocked: 'yes' })).status).toBe(400);
      expect((await request(path, decision, 'POST', false)).status).toBe(403);
      expect((await request(`/admin/${crypto.randomUUID()}/event-link`, decision)).status).toBe(
        404,
      );
      expect((await request(path, { ...decision, revision: 0 })).status).toBe(409);
      expect((await service.byTournament(events[0])).albums).toHaveLength(1);
      const blocked = await request(path, decision);
      expect(blocked.status).toBe(200);
      expect(blocked.headers.get('cache-control')).toBe('private, no-store');
      album = (await blocked.json()).data;
      expect((await service.byTournament(events[0])).albums).toHaveLength(0);
      const read = () => service.read(album.id, owner, 0);
      expect((await read()).album).toMatchObject({
        eventLinkBlocked: true,
        tournamentId: null,
        visibility: 'public',
        imageCount: 1,
      });
      expect((await read()).images[0].fileId).toBe(fileId);
      for (const visitor of [undefined, admin])
        expect((await service.read(album.id, visitor, 0)).album).not.toHaveProperty(
          'eventLinkBlocked',
        );
      expect((await service.list(owner, undefined, true)).albums[0]).not.toHaveProperty(
        'eventLinkBlocked',
      );
      expect((await service.list(owner)).albums[0].eventLinkBlocked).toBe(true);
      viewer = owner;
      expect(
        (
          await request(
            `/albums/${album.id}`,
            { revision: album.revision, eventLinkBlocked: false },
            'PATCH',
          )
        ).status,
      ).toBe(400);
      for (const visibility of ['private', 'unlisted', 'public'] as const) {
        album = await service.update(owner, album.id, {
          revision: album.revision,
          visibility,
          title: `Still ${visibility}`,
        });
        for (const tournamentId of events) {
          expect(
            (
              await request(
                `/albums/${album.id}`,
                { revision: album.revision, visibility: 'public', tournamentId },
                'PATCH',
              )
            ).status,
          ).toBe(403);
        }
      }
      album = await service.update(owner, album.id, {
        revision: album.revision,
        visibility: 'private',
      });
      viewer = admin;
      const list = await request('/admin/blocked');
      expect(list.status).toBe(200);
      const listing = (await list.json()).data;
      const listed = listing.albums.find((item: { id: string }) => item.id === album.id);
      expect(listed).toBeDefined();
      expect(Object.keys(listed).sort()).toEqual(['createdAt', 'id', 'owner', 'revision', 'title']);
      // Admin can restore sharing without bypassing the private album's content visibility.
      await expect(service.read(album.id, admin, 0)).rejects.toMatchObject({ status: 404 });
      await expect(
        db
          .update(userAlbum)
          .set({ tournamentId: events[0], visibility: 'public' })
          .where(eq(userAlbum.id, album.id))
          .execute(),
      ).rejects.toThrow();
      const restored = await request(path, { revision: album.revision, blocked: false });
      expect(restored.status).toBe(200);
      album = (await restored.json()).data;
      expect((await read()).album).toMatchObject({
        eventLinkBlocked: false,
        tournamentId: null,
        visibility: 'private',
        imageCount: 1,
      });
      expect((await service.blockedEventAlbums()).albums.some(item => item.id === album.id)).toBe(
        false,
      );
      expect((await request(path, { revision: album.revision, blocked: true })).status).toBe(409);
      album = await service.update(owner, album.id, {
        revision: album.revision,
        visibility: 'public',
        tournamentId: events[1],
      });
      const eventAlbums = (await service.byTournament(events[1])).albums;
      expect(eventAlbums).toHaveLength(1);
      expect(eventAlbums[0]).not.toHaveProperty('eventLinkBlocked');
      // A repeated restore must not silently remove a new event link.
      expect((await request(path, { revision: album.revision, blocked: false })).status).toBe(200);
      expect((await read()).album.tournamentId).toBe(events[1]);
      const raced = await Promise.allSettled([
        service.moderateEventLink(album.id, { revision: album.revision, blocked: true }),
        service.update(owner, album.id, { revision: album.revision, tournamentId: events[0] }),
      ]);
      expect(raced.filter(result => result.status === 'fulfilled')).toHaveLength(1);
      expect(raced.find(result => result.status === 'rejected')).toMatchObject({
        reason: { status: 409 },
      });
      // Blocked lists use stable cursors even when earlier entries are restored.
      const more = await db
        .insert(userAlbum)
        .values(
          Array.from({ length: 14 }, (_, index) => ({
            userId: owner,
            title: `Blocked ${index}`,
            eventLinkBlocked: true,
          })),
        )
        .returning({ id: userAlbum.id });
      const first = await service.blockedEventAlbums();
      expect(first.albums).toHaveLength(12);
      const restore = first.albums.find(item => item.owner.id === owner)!;
      await service.moderateEventLink(restore.id, {
        revision: restore.revision,
        blocked: false,
      });
      const collected = [...first.albums];
      let cursor = first.nextCursor;
      while (cursor) {
        const next = await service.blockedEventAlbums(cursor);
        collected.push(...next.albums);
        cursor = next.nextCursor;
      }
      expect(new Set(collected.map(item => item.id)).size).toBe(collected.length);
      expect(more.every(item => collected.some(listed => listed.id === item.id))).toBe(true);
    } finally {
      await db.delete(tournament).where(inArray(tournament.id, events));
      await db.delete(user).where(inArray(user.id, [owner, admin]));
    }
  },
  30_000,
);
