import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import postgres from 'postgres';
import type { AuthExtension } from '../../auth/auth.ts';
import { deckIdFavoritePostRoute } from '../../routes/decks/_id/favorite/post.ts';
import { userSettingsGetRoute } from '../../routes/user-settings/get.ts';
import { userSettingsPostRoute } from '../../routes/user-settings/post.ts';
import { notificationsRoute } from '../../routes/notifications.ts';
import { notifications } from './service.ts';
import { createInvitationNotification } from './publish.ts';
import { userNotificationChannel } from '../../../shared/types/notifications.ts';

test.skipIf(process.env.NOTIFICATIONS_DB_TEST !== '1')(
  'durable inbox, favorite preferences, ownership, pagination and private dump cleanup',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Select an isolated worktree database.');
    const sql = postgres(url.toString(), { max: 4 });
    const owner = `notify-${crypto.randomUUID()}`,
      actor = `${owner}-actor`,
      other = `${owner}-other`;
    const deckId = crypto.randomUUID(),
      privateId = crypto.randomUUID(),
      lobbyId = crypto.randomUUID();
    const signals: { userId: string; type: string }[] = [];
    const listener = await sql.listen(userNotificationChannel, raw =>
      signals.push(JSON.parse(raw)),
    );
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        const id = c.req.header('test-user');
        if (id)
          c.set('user', { id, role: 'crossfire' } as NonNullable<
            AuthExtension['Variables']['user']
          >);
        await next();
      })
      .route('/decks/:id/favorite', deckIdFavoritePostRoute)
      .route('/settings', userSettingsGetRoute)
      .route('/settings', userSettingsPostRoute)
      .route('/notifications', notificationsRoute);
    const request = async (path: string, id?: string, body?: unknown, method = 'POST') =>
      app.request(path, {
        method: body === undefined ? 'GET' : method,
        headers: { ...(id ? { 'test-user': id } : {}), 'content-type': 'application/json' },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    const favorite = (id = actor, target = deckId, isFavorite = true) =>
      request(`/decks/${target}/favorite`, id, { isFavorite });
    try {
      for (const id of [owner, actor, other])
        await sql`INSERT INTO public."user" (id,name,display_name,email,email_verified,currency,created_at,updated_at)
      VALUES (${id}, 'Notification fixture', ${id}, ${id + '@invalid.local'}, false, 'USD', now(), now())`;
      await sql`INSERT INTO deck (id, user_id, format, public, name) VALUES (${deckId}, ${owner}, 1, 1, 'Fixture deck'), (${privateId}, ${owner}, 1, 0, 'Private fixture')`;
      expect((await request('/notifications')).status).toBe(401);
      expect((await request('/notifications/unread')).status).toBe(401);
      expect(
        (await request('/settings', undefined, { notifications_deck_favorites: false })).status,
      ).toBe(401);
      expect(
        (await request('/settings', owner).then(r => r.json())).notifications_deck_favorites,
      ).toBe(true);
      expect((await favorite(actor, privateId)).status).toBe(404);
      expect((await favorite(owner)).status).toBe(201);
      expect(await notifications.unreadCount(owner, false)).toBe(0);
      expect((await favorite()).status).toBe(201);
      expect(await notifications.unreadCount(owner, false)).toBe(1);
      let item = (await notifications.list(owner, false)).items[0]!;
      expect(item).toMatchObject({
        type: 'deck.favorite',
        actorUserId: actor,
        actorName: actor,
        entityName: 'Fixture deck',
      });
      expect((await request('/notifications/unread', owner).then(r => r.json())).items).toEqual([
        item,
      ]);
      expect((await request('/notifications/unread', actor).then(r => r.json())).items).toEqual([]);
      for (const blankName of ['   ', '\t\n', '\u00a0']) {
        await sql`UPDATE public."user" SET display_name = ${blankName} WHERE id = ${actor}`;
        expect((await notifications.list(owner, false)).items[0]).toMatchObject({
          actorUserId: actor,
          actorName: null,
        });
      }
      await sql`UPDATE public."user" SET display_name = ${actor} WHERE id = ${actor}`;
      expect((await notifications.list(actor, false)).items).toHaveLength(0);
      expect(
        (await request(`/notifications/${item.id}`, other, { action: 'read' }, 'PATCH')).status,
      ).toBe(404);
      expect(await notifications.unreadCount(owner, false)).toBe(1);
      await favorite();
      await favorite(actor, deckId, false);
      expect((await notifications.list(owner, false)).items).toHaveLength(0);
      expect(await sql`SELECT id FROM user_notification WHERE id = ${item.id}`).toHaveLength(0);
      await favorite();
      const recreated = (await notifications.list(owner, false)).items[0]!;
      expect(recreated.id).not.toBe(item.id);
      item = recreated;
      await notifications.update(owner, item.id, 'read');
      await notifications.update(owner, item.id, 'unread');
      await favorite(actor, deckId, false);
      expect((await notifications.list(owner, false)).items[0]?.id).toBe(item.id);
      await favorite();
      expect((await notifications.list(owner, false)).items).toHaveLength(1);

      await request('/settings', owner, {
        homepageMode: 'live',
        notifications_deck_favorites: false,
      });
      expect((await request('/settings', owner).then(r => r.json())).homepageMode).toBe('live');
      await favorite(other);
      expect(await notifications.unreadCount(owner, false)).toBe(1);
      expect(
        (await request('/settings', owner, { notifications_crossfire_invitations: false })).status,
      ).toBe(400);
      expect(
        (await request('/settings', owner, { notifications_deck_favorites: 'garbage' })).status,
      ).toBe(400);
      await request('/settings', owner, { notifications_deck_favorites: true });
      expect((await request('/settings', owner).then(r => r.json())).homepageMode).toBe('live');
      await favorite(other, deckId, false);
      await favorite(other);
      expect(await notifications.unreadCount(owner, false)).toBe(2);
      await notifications.readAll(owner, false);
      expect(await notifications.unreadCount(owner, false)).toBe(0);
      expect((await request('/notifications/unread', owner).then(r => r.json())).items).toEqual([]);
      await notifications.update(owner, item.id, 'unread');
      expect(await notifications.unreadCount(owner, false)).toBe(1);
      await notifications.update(owner, item.id, 'archive');
      expect(await notifications.unreadCount(owner, false)).toBe(0);
      expect((await request('/notifications/unread', owner).then(r => r.json())).items).toEqual([]);
      expect((await notifications.list(owner, false)).items).toHaveLength(1);

      // A failed source transaction must leave neither a row nor a realtime signal.
      await expect(
        sql.begin(async tx => {
          await createInvitationNotification(tx, other, actor, lobbyId);
          throw new Error('rollback');
        }),
      ).rejects.toThrow('rollback');
      expect(await sql`SELECT id FROM user_notification WHERE entity_id = ${lobbyId}`).toHaveLength(
        0,
      );
      await Bun.sleep(30);
      expect(
        signals.filter(s => s.userId === other && s.type === 'notifications.changed'),
      ).toHaveLength(0);
      await sql`INSERT INTO play.lobbies (id,creator_user_id,versions,allow_spectators,hands_to_players,hands_to_spectators)
      VALUES (${lobbyId}, ${actor}, '{}', false, false, false)`;
      await sql`INSERT INTO play.invitations (lobby_id,recipient_user_id) VALUES (${lobbyId}, ${owner})`;
      await request('/settings', owner, { notifications_deck_favorites: false });
      await sql.begin(tx => createInvitationNotification(tx, owner, actor, lobbyId));
      expect(
        (await notifications.list(owner, true)).items.some(
          i => i.type === 'crossfire.invitation' && i.available,
        ),
      ).toBe(true);
      expect(
        (await notifications.list(owner, false)).items.some(i => i.type === 'crossfire.invitation'),
      ).toBe(false);
      expect(
        (await notifications.list(owner, false, undefined, { unreadOnly: true, limit: 5 })).items,
      ).toHaveLength(0);
      expect(
        (await notifications.list(owner, true, undefined, { unreadOnly: true, limit: 5 })).items[0]
          ?.type,
      ).toBe('crossfire.invitation');
      await sql`UPDATE play.lobbies SET status = 'cancelled' WHERE id = ${lobbyId}`;
      expect(
        (await notifications.list(owner, true)).items.find(i => i.type === 'crossfire.invitation')
          ?.available,
      ).toBe(false);

      // Keyset pagination must preserve Postgres microseconds, including timestamp ties.
      await sql`DELETE FROM user_notification WHERE recipient_user_id = ${owner}`;
      await sql`INSERT INTO user_notification (recipient_user_id,actor_user_id,type,entity_type,entity_id,dedupe_key,created_at)
      SELECT ${owner}, ${actor}, 'deck.favorite', 'deck', ${deckId}, 'page:' || n, '2026-01-01 00:00:00.123456+00'::timestamptz FROM generate_series(1,35) n`;
      const first = await notifications.list(owner, false);
      const second = await notifications.list(owner, false, first.nextCursor!);
      expect(first.items).toHaveLength(30);
      expect(second.items).toHaveLength(5);
      expect(new Set([...first.items, ...second.items].map(i => i.id)).size).toBe(35);
      expect(second.nextCursor).toBeNull();
      // The preview must find older unread rows even beneath a full page of read entries.
      await sql`UPDATE user_notification SET read_at = now() WHERE recipient_user_id = ${owner}`;
      await sql`INSERT INTO user_notification (recipient_user_id,actor_user_id,type,entity_type,entity_id,dedupe_key,created_at)
        SELECT ${owner}, ${actor}, 'deck.favorite', 'deck', ${deckId}, 'older:' || n,
        '2025-12-01'::timestamptz + n * interval '1 minute' FROM generate_series(1,8) n`;
      await sql`INSERT INTO user_notification (recipient_user_id,actor_user_id,type,entity_type,entity_id,dedupe_key,archived_at)
        VALUES (${owner}, ${actor}, 'deck.favorite', 'deck', ${deckId}, 'archived-preview', now()),
        (${owner}, ${actor}, 'deck.favorite', 'deck', ${crypto.randomUUID()}, 'missing-target-preview', NULL)`;
      const preview = (await request('/notifications/unread', owner).then(r => r.json())).items;
      expect(preview).toHaveLength(5);
      expect(preview.every((entry: { readAt: string | null }) => entry.readAt === null)).toBe(true);
      expect(preview.map((entry: { createdAt: string }) => entry.createdAt)).toEqual(
        [8, 7, 6, 5, 4].map(minute => `2025-12-01T00:0${minute}:00.000000Z`),
      );
      await notifications.update(owner, preview[0].id, 'read');
      const afterRead = (await request('/notifications/unread', owner).then(r => r.json())).items;
      expect(afterRead).toHaveLength(5);
      expect(afterRead.some((entry: { id: string }) => entry.id === preview[0].id)).toBe(false);
      expect(afterRead[4].createdAt).toBe('2025-12-01T00:03:00.000000Z');
      await notifications.readAll(owner, false);
      expect((await request('/notifications/unread', owner).then(r => r.json())).items).toEqual([]);
      expect((await request('/notifications', owner).then(r => r.json())).items[0]).toMatchObject({
        actorUserId: actor,
        actorName: actor,
      });
      await sql`DELETE FROM play.lobbies WHERE id = ${lobbyId}`;
      await sql`DELETE FROM public."user" WHERE id = ${actor}`;
      expect((await notifications.list(owner, false)).items[0]).toMatchObject({
        actorUserId: null,
        actorName: null,
      });
      expect((await request('/notifications?cursor=garbage', owner)).status).toBe(400);
      await sql`UPDATE deck SET user_id = ${other} WHERE id = ${deckId}`;
      expect(await notifications.unreadCount(owner, false)).toBe(0);
      expect((await notifications.list(owner, false)).items).toHaveLength(0);

      const sanitizer = await Bun.file(
        new URL('../../../scripts/remote-dev/sql/001-core-data.sql', import.meta.url),
      ).text();
      const cleanup = sanitizer.match(/TRUNCATE TABLE user_notification;/)![0];
      const assertion = sanitizer.match(
        /IF EXISTS \(SELECT 1 FROM user_notification\) THEN[\s\S]*?END IF;/,
      )![0];
      await sql.begin(async tx => {
        await tx`CREATE TEMP TABLE user_notification (id int) ON COMMIT DROP`;
        await tx`INSERT INTO user_notification VALUES (1)`;
        await tx.unsafe(cleanup);
        await tx.unsafe(`DO $$ BEGIN ${assertion} END $$;`);
        expect(await tx`SELECT * FROM user_notification`).toHaveLength(0);
      });
      expect(signals.some(s => s.userId === owner && s.type === 'user.settings.changed')).toBe(
        true,
      );
    } finally {
      await listener.unlisten();
      await sql`DELETE FROM play.lobbies WHERE id = ${lobbyId}`;
      await sql`DELETE FROM user_deck_favorite WHERE deck_id IN (${deckId}, ${privateId})`;
      await sql`DELETE FROM deck WHERE id IN (${deckId}, ${privateId})`;
      await sql`DELETE FROM public."user" WHERE id IN (${owner},${actor},${other})`;
      await sql.end();
    }
  },
  30_000,
);
