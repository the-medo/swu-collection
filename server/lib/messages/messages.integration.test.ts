import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import postgres from 'postgres';
import type { AuthExtension } from '../../auth/auth.ts';
import { messagesRoute } from '../../routes/messages.ts';
import { messages } from './service.ts';

test.skipIf(process.env.MESSAGES_DB_TEST !== '1')(
  'private messaging, concurrent sends, retries, read cursors, pagination and dump cleanup',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Select an isolated worktree DB.');
    const sql = postgres(url.toString(), { max: 4 });
    const prefix = `messenger-${crypto.randomUUID()}`;
    const a = prefix + '-a',
      b = prefix + '-b',
      outsider = prefix + '-outsider';
    const others = Array.from({ length: 31 }, (_, i) => `${prefix}-peer-${i}`);
    const users = [a, b, outsider, ...others];
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        const id = c.req.header('test-user');
        if (id) c.set('user', { id } as NonNullable<AuthExtension['Variables']['user']>);
        await next();
      })
      .route('/messages', messagesRoute);
    const request = async (path: string, userId?: string, body?: unknown) =>
      app.request('/messages' + path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { 'content-type': 'application/json', ...(userId ? { 'test-user': userId } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    const send = (from = a, to = b, body = 'Hello', clientMessageId = crypto.randomUUID()) =>
      request(`/with/${to}`, from, { body, clientMessageId });
    try {
      await sql`INSERT INTO public."user" (id,name,display_name,email,email_verified,currency,created_at,updated_at)
      SELECT id, 'Private fixture real name', id, id || '@invalid.local', false, 'USD', now(), now() FROM unnest(${users}::text[]) id`;
      expect((await request('/summary')).status).toBe(401);
      expect((await request(`/with/${b}/updates?after=0`)).status).toBe(401);
      expect(
        (
          await request(`/with/${b}`, undefined, {
            body: 'unauthorized',
            clientMessageId: crypto.randomUUID(),
          })
        ).status,
      ).toBe(401);
      const empty = await request(`/with/${b}`, a);
      expect(empty.headers.get('cache-control')).toBe('private, no-store');
      expect(await empty.json()).toMatchObject({ conversationId: null, items: [] });
      expect(
        await sql`SELECT id FROM direct_conversation WHERE user_one_id=${a} OR user_two_id=${a}`,
      ).toHaveLength(0);
      expect((await send(a, a)).status).toBe(400);
      expect((await send(a, 'swubase')).status).toBe(400);
      expect((await send('swubase', a)).status).toBe(400);
      expect((await send(a, prefix + '-missing')).status).toBe(404);
      expect((await send(a, b, ' \n\t ')).status).toBe(400);
      expect((await send(a, b, 'x'.repeat(5001))).status).toBe(400);
      expect(
        (
          await request(`/with/${b}`, a, {
            body: 'forged',
            clientMessageId: crypto.randomUUID(),
            senderId: outsider,
          })
        ).status,
      ).toBe(400);
      expect((await request('/conversations?cursor=garbage', a)).status).toBe(400);
      expect((await request(`/with/${b}?before=-1`, a)).status).toBe(400);
      expect((await request(`/with/${b}/updates?after=-1`, a)).status).toBe(400);
      const firstResponse = await send(a, b, '  Hello\n<svg onload=alert(1)>  ');
      expect(firstResponse.status).toBe(201);
      const first = await firstResponse.json();
      expect(first.message.body).toBe('Hello\n<svg onload=alert(1)>');
      expect(first.message.senderId).toBe(a);
      expect(first.message.sequence).toBe(1);
      expect(await messages.summary(a)).toEqual({ unreadCount: 0 });
      expect(await messages.summary(b)).toEqual({ unreadCount: 1 });
      expect((await messages.history(outsider, b)).items).toHaveLength(0);
      expect((await request(`/with/${b}/updates?after=0`, outsider)).status).toBe(404);
      const initialUpdate = await request(`/with/${a}/updates?after=0`, b);
      expect(initialUpdate.headers.get('cache-control')).toBe('private, no-store');
      const incoming = await initialUpdate.json();
      expect(incoming.items.map((m: { id: string }) => m.id)).toEqual([first.message.id]);
      expect(incoming.conversation).toMatchObject({
        id: first.conversationId,
        peer: { id: a },
        lastSequence: 1,
        readSequence: 0,
        unreadCount: 1,
      });
      expect(incoming.summary).toEqual({ unreadCount: 1 });
      expect(incoming.hasMore).toBe(false);
      expect((await messages.updates(b, a)).items).toEqual([]);
      expect((await messages.updates(b, a, 1)).items).toEqual([]);
      expect(
        (
          await request(`/conversations/${first.conversationId}/read`, outsider, {
            throughSequence: 1,
          })
        ).status,
      ).toBe(404);
      expect((await messages.conversations(outsider)).items).toHaveLength(0);
      const back = await send(b, a, 'Reply').then(r => r.json());
      expect(back.conversationId).toBe(first.conversationId);
      expect(back.message.sequence).toBe(2);
      const simultaneous = await Promise.all([
        send(a, b, 'A simultaneous'),
        send(b, a, 'B simultaneous'),
      ]);
      expect(simultaneous.map(r => r.status)).toEqual([201, 201]);
      const history = await messages.history(a, b);
      expect(history.items.map(item => item.sequence)).toEqual([1, 2, 3, 4]);
      expect(history.peer).toEqual({ id: b, displayName: b, image: null });
      expect(JSON.stringify(history)).not.toContain('@invalid.local');
      expect(JSON.stringify(history)).not.toContain('Private fixture real name');
      const retryId = crypto.randomUUID();
      const retries = await Promise.all([
        send(a, b, 'Retry safe', retryId),
        send(a, b, 'Retry safe', retryId),
      ]);
      const retryMessages = await Promise.all(retries.map(r => r.json()));
      expect(retryMessages[0].message.id).toBe(retryMessages[1].message.id);
      expect((await messages.history(a, b)).items).toHaveLength(5);
      expect((await send(a, b, 'Changed request', retryId)).status).toBe(409);
      expect((await send(a, outsider, 'Retry safe', retryId)).status).toBe(409);
      expect((await messages.history(a, outsider)).items).toHaveLength(0);
      expect(await messages.summary(a)).toEqual({ unreadCount: 2 });
      expect(
        (await request(`/conversations/${first.conversationId}/read`, a, { throughSequence: 5 }))
          .status,
      ).toBe(200);
      expect(await messages.summary(a)).toEqual({ unreadCount: 0 });
      expect((await messages.history(a, b)).readSequence).toBe(5);
      expect((await messages.history(b, a)).readSequence).toBe(0);
      expect(await messages.summary(b)).toEqual({ unreadCount: 3 });
      await send(b, a, 'Arrived after the read');
      await request(`/conversations/${first.conversationId}/read`, a, { throughSequence: 4 });
      expect(await messages.summary(a)).toEqual({ unreadCount: 1 });
      // Messages paginate by committed sequence, including timestamp ties, with latest at the bottom.
      await sql.begin(async tx => {
        await tx`INSERT INTO direct_message (conversation_id,sequence,sender_id,client_message_id,body,created_at)
        SELECT ${first.conversationId},n,${b},gen_random_uuid(),'History ' || n,'2026-01-01'::timestamptz FROM generate_series(7,76) n`;
        await tx`UPDATE direct_conversation SET last_sequence=76,last_message_at=clock_timestamp() WHERE id=${first.conversationId}`;
      });
      const newest = await messages.history(a, b);
      const older = await messages.history(a, b, newest.nextBefore!);
      const oldest = await messages.history(a, b, older.nextBefore!);
      expect(newest.items).toHaveLength(30);
      expect(newest.items[0].sequence).toBe(47);
      expect(newest.items.at(-1)?.sequence).toBe(76);
      expect(newest.nextBefore).toBe(47);
      expect(older.items).toHaveLength(30);
      expect(older.nextBefore).toBe(17);
      expect(oldest.items).toHaveLength(16);
      expect(oldest.nextBefore).toBeNull();
      const allItems = [...oldest.items, ...older.items, ...newest.items];
      expect(allItems.map(m => m.sequence)).toEqual(Array.from({ length: 76 }, (_, i) => i + 1));
      expect(new Set(allItems.map(m => m.id)).size).toBe(76);
      const delta1 = await messages.updates(a, b, 6);
      const delta2 = await messages.updates(a, b, delta1.items.at(-1)!.sequence);
      const delta3 = await messages.updates(a, b, delta2.items.at(-1)!.sequence);
      expect(delta1.items).toHaveLength(30);
      expect(delta2.items).toHaveLength(30);
      expect(delta3.items).toHaveLength(10);
      expect([delta1.hasMore, delta2.hasMore, delta3.hasMore]).toEqual([true, true, false]);
      expect([...delta1.items, ...delta2.items, ...delta3.items].map(m => m.sequence)).toEqual(
        Array.from({ length: 70 }, (_, i) => i + 7),
      );
      expect(delta3.conversation.lastSequence).toBe(76);
      expect(delta3.summary).toEqual(await messages.summary(a));
      await messages.read(a, first.conversationId, 76);
      const readUpdate = await messages.updates(a, b, 76);
      expect(readUpdate.items).toEqual([]);
      expect(readUpdate.conversation).toMatchObject({ readSequence: 76, unreadCount: 0 });
      expect(readUpdate.summary).toEqual({ unreadCount: 0 });
      expect(await messages.summary(a)).toEqual({ unreadCount: 0 });
      await send(b, a, 'Newest after paging');
      expect((await messages.history(a, b)).items.at(-1)?.sequence).toBe(77);
      expect(await messages.summary(a)).toEqual({ unreadCount: 1 });
      // A bounded, stable conversation list works beyond its first page.
      for (const other of others)
        expect((await send(a, other, 'Other conversation')).status).toBe(201);
      const page1 = await messages.conversations(a),
        page2 = await messages.conversations(a, page1.nextCursor!);
      expect(page1.items).toHaveLength(30);
      expect(page2.items).toHaveLength(2);
      expect(page2.nextCursor).toBeNull();
      expect(new Set([...page1.items, ...page2.items].map(c => c.id)).size).toBe(32);
      expect([...page1.items, ...page2.items].find(c => c.peer.id === b)?.lastMessage.body).toBe(
        'Newest after paging',
      );
      // Rate limiting is persisted, serialized across writers, and does not break idempotent retries.
      await sql`UPDATE direct_message SET created_at=now() WHERE sender_id=${b}`;
      expect((await send(b, a, 'Too many')).status).toBe(429);
      expect((await send(a, b, 'Retry safe', retryId)).status).toBe(201);
      const sanitizer = await Bun.file(
        new URL('../../../scripts/remote-dev/sql/001-core-data.sql', import.meta.url),
      ).text();
      const cleanup = sanitizer.match(/TRUNCATE TABLE direct_message, direct_conversation;/)![0];
      const assertion = sanitizer.match(
        /IF EXISTS \(SELECT 1 FROM direct_message\)[\s\S]*?END IF;/,
      )![0];
      await sql.begin(async tx => {
        await tx`CREATE TEMP TABLE direct_conversation (id int PRIMARY KEY) ON COMMIT DROP`;
        await tx`CREATE TEMP TABLE direct_message (id int,conversation_id int REFERENCES direct_conversation(id)) ON COMMIT DROP`;
        await tx`INSERT INTO direct_conversation VALUES (1)`;
        await tx`INSERT INTO direct_message VALUES (1,1)`;
        await tx.unsafe(cleanup);
        await tx.unsafe(`DO $$ BEGIN ${assertion} END $$;`);
        expect(await tx`SELECT * FROM direct_message`).toHaveLength(0);
        expect(await tx`SELECT * FROM direct_conversation`).toHaveLength(0);
      });
      await sql`DELETE FROM public."user" WHERE id=${b}`;
      expect(
        await sql`SELECT id FROM direct_conversation WHERE id=${first.conversationId}`,
      ).toHaveLength(0);
      expect(
        await sql`SELECT id FROM direct_message WHERE conversation_id=${first.conversationId}`,
      ).toHaveLength(0);
    } finally {
      await sql`DELETE FROM public."user" WHERE id=ANY(${users})`;
      await sql.end();
    }
  },
  30_000,
);
