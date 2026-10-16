import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import type { AuthExtension } from '../../auth/auth.ts';
import { createCreatorHubRoute } from '../../routes/creator-hub.ts';
import { createCreatorService } from './service.ts';

test.skipIf(process.env.CREATOR_HUB_DB_TEST !== '1')(
  'connection choices enforce deck ownership, paginate by date, and resolve only public metadata',
  async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_'))
      throw new Error('Use an isolated worktree database.');
    const sql = postgres(target.toString(), { max: 1 });
    await sql.unsafe('BEGIN');
    try {
      const owner = `connections-${crypto.randomUUID()}`,
        other = `connections-${crypto.randomUUID()}`;
      for (const id of [owner, other])
        await sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at, display_name, currency) VALUES (${id}, 'Connection fixture', ${id + '@invalid.local'}, false, now(), now(), ${id}, 'USD')`;
      const name = `Connections ${crypto.randomUUID()}`;
      const deckIds: string[] = [];
      for (const [userId, visibility] of [
        [owner, 1],
        [owner, 0],
        [owner, 2],
        [other, 1],
        [other, 0],
      ] as const) {
        const id = crypto.randomUUID();
        deckIds.push(id);
        await sql`INSERT INTO deck (id, user_id, format, name, public, leader_card_id_1, base_card_id) VALUES (${id}, ${userId}, 1, ${name}, ${visibility}, 'sabine-wren--galvanized-revolutionary', 'command-center')`;
      }
      const service = createCreatorService(drizzle(sql));
      const app = new Hono<AuthExtension>()
        .use('*', async (c, next) => {
          const id = c.req.header('x-fixture-user');
          c.set('user', id ? ({ id } as NonNullable<AuthExtension['Variables']['user']>) : null);
          await next();
        })
        .route('/', createCreatorHubRoute(service));
      const choices = `/subjects?type=deck&scope=authoring&q=${encodeURIComponent(name)}`;
      expect((await app.request(choices)).status).toBe(401);
      const ownResponse = await app.request(choices, { headers: { 'x-fixture-user': owner } });
      expect(ownResponse.status).toBe(200);
      expect((await ownResponse.json()).data.map((row: { id: string }) => row.id)).toEqual([
        deckIds[0],
      ]);
      expect(
        (await service.subjects('deck', name, 'authoring', { userId: other })).map(row => row.id),
      ).toEqual([deckIds[3]]);
      expect(new Set((await service.subjects('deck', name)).map(row => row.id))).toEqual(
        new Set([deckIds[0], deckIds[3]]),
      );
      const refs = deckIds.map(id => ({ type: 'deck' as const, id, startSeconds: null }));
      const resolved = await service.resolveSubjects(refs);
      expect(resolved.map(row => row.id)).toEqual([deckIds[0], deckIds[3]]);
      expect(resolved[0]).toMatchObject({
        label: name,
        leaderId: 'sabine-wren--galvanized-revolutionary',
        baseId: 'command-center',
        href: `/decks/${deckIds[0]}`,
      });
      await sql`UPDATE deck SET public = 0 WHERE id = ${deckIds[0]}`;
      expect((await service.resolveSubjects(refs)).map(row => row.id)).toEqual([deckIds[3]]);
      expect(
        (
          await app.request('/subjects/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ references: refs }),
          })
        ).status,
      ).toBe(401);
      const headers = {
        'x-fixture-user': owner,
        'X-Requested-With': 'swubase',
        'Content-Type': 'application/json',
      };
      expect(
        (
          await app.request('/subjects/resolve', {
            method: 'POST',
            headers,
            body: JSON.stringify({ references: Array(51).fill(refs[0]) }),
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await app.request('/subjects/resolve', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              references: [refs[3], { type: 'deck', id: 'not-a-uuid', startSeconds: null }],
            }),
          })
        ).status,
      ).toBe(200);
      expect((await app.request('/subjects?type=tournament&page=0')).status).toBe(400);

      const [local] = await sql`SELECT id FROM tournament_type WHERE major = 0 LIMIT 1`;
      const ids: string[] = [];
      for (let offset = -50; offset <= 2; offset++) {
        const id = crypto.randomUUID();
        ids.push(id);
        await sql`INSERT INTO tournament (id,user_id,type,location,continent,name,attendance,format,days,date) VALUES (${id},${owner},${local.id},'Paris','Europe',${name},1,1,1,CURRENT_DATE + ${offset}::int)`;
      }
      const first = await service.subjects('tournament', name, 'authoring');
      expect(first).toHaveLength(12);
      const remaining = [];
      for (let page = 2; page <= 5; page++)
        remaining.push(...(await service.subjects('tournament', name, 'authoring', { page })));
      expect(remaining).toHaveLength(41);
      expect([...first, ...remaining].map(row => row.id)).toEqual(ids.toReversed());
      const pagedResponse = await app.request(
        `/subjects?type=tournament&scope=authoring&page=2&q=${encodeURIComponent(name)}`,
      );
      expect((await pagedResponse.json()).data.map((row: { id: string }) => row.id)).toEqual(
        remaining.slice(0, 12).map(row => row.id),
      );
      expect(first[0]).toMatchObject({
        location: 'Paris',
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      });
      expect((await service.subjects('tournament', name)).some(row => row.id === ids.at(-1))).toBe(
        false,
      );
      const [event] = await service.resolveSubjects([
        { type: 'tournament', id: ids.at(-1)!, startSeconds: null },
      ]);
      expect(event).toMatchObject({ date: first[0].date, location: 'Paris', label: name });
    } finally {
      await sql.unsafe('ROLLBACK');
      await sql.end();
    }
  },
);
