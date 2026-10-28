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
import type { AuthExtension } from '../../auth/auth.ts';

test.skipIf(process.env.USER_ALBUMS_DB_TEST !== '1')(
  'tournament linking requires public consent, preserves ownership, and paginates public photos',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Select an isolated worktree database.');
    const owners = [0, 1].map(() => `event-album-test-${crypto.randomUUID()}`);
    const eventId = crypto.randomUUID();
    const eventName = `Photos %_ ${eventId}`;
    const service = createUserAlbumService({
      publicUrl: key => `https://images.example.com/${key}`,
    });
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
    const request = (path: string, body?: unknown, method = body ? 'PATCH' : 'GET') =>
      app.request(`/api/user-albums${path}`, {
        method,
        headers: { 'X-Requested-With': 'swubase', 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
    try {
      await db.insert(user).values(
        owners.map(id => ({
          id,
          name: 'Event photographer',
          displayName: id,
          image: 'https://images.example.com/avatar.webp',
          email: `${id}@invalid.local`,
          emailVerified: false,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      const [kind] = await db.select().from(tournamentType).limit(1);
      const [gameFormat] = await db.select().from(format).limit(1);
      await db.insert(tournament).values({
        id: eventId,
        userId: owners[0],
        type: kind.id,
        format: gameFormat.id,
        name: eventName,
        location: 'Paris',
        continent: 'Europe',
        attendance: 32,
        days: 1,
        date: new Date('2026-10-15'),
      });
      for (const visibility of [undefined, 'private', 'unlisted']) {
        expect(
          (await request('', { title: 'Event album', visibility, tournamentId: eventId }, 'POST'))
            .status,
        ).toBe(400);
      }
      expect(
        (
          await request(
            '',
            { title: 'Event album', visibility: 'public', tournamentId: 'invalid' },
            'POST',
          )
        ).status,
      ).toBe(400);
      expect(
        (
          await request(
            '',
            { title: 'Event album', visibility: 'public', tournamentId: crypto.randomUUID() },
            'POST',
          )
        ).status,
      ).toBe(404);
      expect((await service.list(owners[0])).albums).toHaveLength(0);
      viewer = null;
      expect(
        (
          await request(
            '',
            { title: 'Event album', visibility: 'public', tournamentId: eventId },
            'POST',
          )
        ).status,
      ).toBe(401);
      viewer = owners[0];
      const created = await request(
        '',
        { title: 'Event album', visibility: 'public', tournamentId: eventId },
        'POST',
      );
      expect(created.status).toBe(201);
      const createdAlbum = (await created.json()).data;
      expect((await service.read(createdAlbum.id, owners[0], 0)).album).toMatchObject({
        userId: owners[0],
        visibility: 'public',
        tournamentId: eventId,
      });
      await service.remove(owners[0], createdAlbum.id, createdAlbum.revision);
      const files = Array.from({ length: 8 }, () => crypto.randomUUID());
      await db.insert(userFile).values(
        files.map(id => ({
          id,
          userId: owners[0],
          fileName: 'private-name.png',
          imageKey: `${id}.webp`,
          thumbnailKey: `${id}-thumb.webp`,
          originalByteSize: 20,
          byteSize: 10,
          thumbnailByteSize: 2,
          width: 20,
          height: 10,
        })),
      );
      let album = await service.create(owners[0], {
        title: 'Event memories',
        description: '',
        visibility: 'unlisted',
      });
      const read = () => service.read(album.id, owners[0], 0);
      album = await service.addImages(owners[0], album.id, {
        revision: album.revision,
        fileIds: files,
      });
      for (const visibility of ['unlisted', 'private'] as const) {
        album = await service.update(owners[0], album.id, { revision: album.revision, visibility });
        expect(
          (await request(`/${album.id}`, { revision: album.revision, tournamentId: eventId }))
            .status,
        ).toBe(400);
        expect((await read()).album).toMatchObject({
          visibility,
          tournamentId: null,
          tournament: null,
          revision: album.revision,
        });
      }
      expect((await service.byTournament(eventId)).albums).toEqual([]);
      expect(
        (
          await request(`/${album.id}`, {
            revision: album.revision - 1,
            visibility: 'public',
            tournamentId: eventId,
          })
        ).status,
      ).toBe(409);
      expect((await read()).album.visibility).toBe('private');
      expect(
        (
          await request(`/${album.id}`, {
            revision: album.revision,
            visibility: 'public',
            tournamentId: crypto.randomUUID(),
          })
        ).status,
      ).toBe(404);
      expect((await read()).album.visibility).toBe('private');
      viewer = owners[1];
      expect(
        (
          await request(`/${album.id}`, {
            revision: album.revision,
            visibility: 'public',
            tournamentId: eventId,
          })
        ).status,
      ).toBe(404);
      viewer = null;
      expect((await request('/tournaments')).status).toBe(401);
      expect(
        (
          await request(`/${album.id}`, {
            revision: album.revision,
            visibility: 'public',
            tournamentId: eventId,
          })
        ).status,
      ).toBe(401);
      viewer = owners[0];
      expect((await request('/tournaments?page=-1')).status).toBe(400);
      expect((await request('/by-tournament/not-a-uuid')).status).toBe(400);
      expect((await request(`/by-tournament/${crypto.randomUUID()}`)).status).toBe(404);
      expect((await service.tournamentOptions(eventName, 0)).tournaments.map(t => t.id)).toEqual([
        eventId,
      ]);
      expect((await service.tournamentOptions(eventId, 0)).tournaments[0]).toMatchObject({
        name: eventName,
        date: '2026-10-15',
      });
      const linked = await request(`/${album.id}`, {
        revision: album.revision,
        visibility: 'public',
        tournamentId: eventId,
      });
      expect(linked.status).toBe(200);
      album = (await linked.json()).data;
      expect((await read()).album).toMatchObject({
        visibility: 'public',
        tournamentId: eventId,
        tournament: { id: eventId, name: eventName },
      });
      viewer = null;
      const response = await request(`/by-tournament/${eventId}`);
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      const feed = (await response.json()).data;
      expect(feed.albums).toHaveLength(1);
      expect(feed.albums[0].cover.fileId).toBe(files[0]);
      expect(feed.albums[0]).not.toHaveProperty('images');
      expect(feed.albums[0].imageCount).toBe(8);
      expect(feed.albums[0].owner).toEqual({
        id: owners[0],
        displayName: owners[0],
        image: 'https://images.example.com/avatar.webp',
      });
      const publicAlbum = await request(`/${album.id}`);
      expect(publicAlbum.status).toBe(200);
      expect((await publicAlbum.json()).data.owner).toEqual(feed.albums[0].owner);
      expect(JSON.stringify(feed)).not.toMatch(
        /private-name|imageKey|thumbnailKey|quotaBytes|usedBytes|@invalid.local/,
      );
      album = await service.updateImage(owners[0], album.id, files[7], {
        revision: album.revision,
        move: { type: 'before', fileId: files[0] },
        caption: 'Winner',
        altText: 'Final table',
      });
      expect((await service.byTournament(eventId)).albums[0].cover?.fileId).toBe(files[7]);
      expect((await read()).images[0]).toMatchObject({
        fileId: files[7],
        caption: 'Winner',
        altText: 'Final table',
      });
      for (const visibility of ['unlisted', 'private'] as const) {
        album = await service.update(owners[0], album.id, { revision: album.revision, visibility });
        expect((await read()).album.tournamentId).toBeNull();
        expect((await service.byTournament(eventId)).albums).toHaveLength(0);
        album = await service.update(owners[0], album.id, {
          revision: album.revision,
          visibility: 'public',
        });
        expect((await service.byTournament(eventId)).albums).toHaveLength(0);
        album = await service.update(owners[0], album.id, {
          revision: album.revision,
          tournamentId: eventId,
        });
      }
      album = await service.update(owners[0], album.id, {
        revision: album.revision,
        tournamentId: null,
      });
      expect((await read()).album).toMatchObject({
        visibility: 'public',
        tournamentId: null,
        imageCount: 8,
      });
      album = await service.update(owners[0], album.id, {
        revision: album.revision,
        tournamentId: eventId,
      });
      // The database also prevents accidental private links from other write paths.
      await expect(
        db
          .update(userAlbum)
          .set({ visibility: 'private' })
          .where(eq(userAlbum.id, album.id))
          .execute(),
      ).rejects.toThrow();
      const empty = await service.create(owners[1], {
        title: 'Empty event album',
        description: '',
        visibility: 'public',
      });
      await service.update(owners[1], empty.id, {
        revision: empty.revision,
        tournamentId: eventId,
      });
      for (let i = 0; i < 12; i++) {
        let next = await service.create(owners[0], {
          title: `Other album ${i}`,
          description: '',
          visibility: 'public',
        });
        next = await service.addImages(owners[0], next.id, {
          revision: next.revision,
          fileIds: [files[0]],
        });
        await service.update(owners[0], next.id, {
          revision: next.revision,
          tournamentId: eventId,
        });
      }
      const first = await service.byTournament(eventId);
      expect(first.albums).toHaveLength(12);
      expect(first.hasMore).toBe(true);
      // Editing a record doesn't reorder creation-based pagination.
      await service.update(owners[0], album.id, { revision: album.revision, title: 'Renamed' });
      const last = await service.byTournament(eventId, first.nextCursor!);
      expect(last.albums.map(a => a.id)).toEqual([album.id]);
      expect(last.hasMore).toBe(false);
      expect(new Set([...first.albums, ...last.albums].map(a => a.id)).size).toBe(13);
      await db.delete(userFile).where(eq(userFile.id, files[0]));
      expect((await service.byTournament(eventId)).albums.map(a => a.id)).toEqual([album.id]);
      await db.delete(tournament).where(eq(tournament.id, eventId));
      expect((await read()).album).toMatchObject({
        tournamentId: null,
        tournament: null,
        visibility: 'public',
        imageCount: 7,
      });
    } finally {
      await db.delete(tournament).where(eq(tournament.id, eventId));
      await db.delete(user).where(inArray(user.id, owners));
    }
  },
  30_000,
);
