import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { inArray } from 'drizzle-orm';
import { user } from '../server/db/schema/auth-schema.ts';
import { cardPools, cardPoolCards } from '../server/db/schema/card_pool.ts';
import { cardList } from '../server/db/lists.ts';
import { createCardPoolRepository, cardPoolGetInput, cardPoolListInput } from './card-pools.ts';
import { createCardPoolTools } from './tools/card-pools.ts';
import { toolSuccess } from './tools/results.ts';

const enabled = process.env.SWUBASE_MCP_DB_TEST === '1';
test.skipIf(!enabled)(
  'restricted pool reads isolate owners, preserve physical copies and expose bounded catalog context',
  async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_'))
      throw new Error('Use an isolated worktree database.');
    const admin = postgres(target.href, { max: 2 }),
      runtime = postgres(target.href, { max: 1 });
    const db = drizzle(admin),
      limited = drizzle(runtime);
    const users = ['mcp-pool-' + crypto.randomUUID(), 'mcp-pool-' + crypto.randomUUID()];
    const ids = Array.from({ length: 7 }, () => crypto.randomUUID());
    const role = 'mcp_pool_' + crypto.randomUUID().replaceAll('-', '');
    try {
      await admin`create role ${admin(role)} nologin`;
      await admin
        .unsafe(
          (await readFile(new URL('./deploy/grants.sql', import.meta.url), 'utf8'))
            .replaceAll('swubase_mcp', role)
            .replace(':"DBNAME"', `"${target.pathname.slice(1)}"`),
        )
        .simple();
      await runtime`set role ${runtime(role)}`;
      await db.insert(user).values(
        users.map(id => ({
          id,
          name: 'Private identity',
          displayName: id,
          email: id + '@invalid.local',
          emailVerified: false,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      await db.insert(cardPools).values(
        ids.map((id, i): typeof cardPools.$inferInsert => ({
          id,
          userId: users[i < 3 ? 0 : 1]!,
          name: i === 0 ? 'Pool %_ literal' : 'Pool ' + i,
          description: 'Description '.repeat(500),
          set: 'sor',
          type: i === 1 ? 'draft' : 'sealed',
          visibility: i === 4 ? 'public' : i === 5 ? 'unlisted' : 'private',
          status: i === 1 ? 'in_progress' : 'ready',
          archivedAt: i === 2 ? '2026-01-01' : null,
        })),
      );
      await db.insert(cardPoolCards).values([
        { cardPoolId: ids[0]!, cardPoolNumber: 2, cardId: 'coruscant-guard' },
        { cardPoolId: ids[0]!, cardPoolNumber: 7, cardId: 'coruscant-guard' },
        {
          cardPoolId: ids[0]!,
          cardPoolNumber: 19,
          cardId: 'qui-gon-jinn--student-of-the-living-force',
        },
        { cardPoolId: ids[0]!, cardPoolNumber: 35, cardId: 'archived-pool-card' },
        { cardPoolId: ids[0]!, cardPoolNumber: 51, cardId: 'pool-preview-fixture' },
        { cardPoolId: ids[4]!, cardPoolNumber: 2, cardId: 'rebel-assault' },
      ]);
      const repo = createCardPoolRepository(limited, async () => ({
        ...cardList,
        'pool-preview-fixture': {
          ...cardList['coruscant-guard']!,
          cardId: 'pool-preview-fixture',
          preview: true,
        },
      }));
      const list = await repo.list(users[0]!, cardPoolListInput.parse({}));
      expect(list.total).toBe(2);
      expect(list.pools.every(pool => !('userId' in pool) && !('description' in pool))).toBe(true);
      expect(
        (await repo.list(users[0]!, cardPoolListInput.parse({ includeArchived: true }))).total,
      ).toBe(3);
      expect(
        (
          await repo.list(
            users[0]!,
            cardPoolListInput.parse({ type: 'draft', status: 'in_progress' }),
          )
        ).total,
      ).toBe(1);
      expect(
        (await repo.list(users[0]!, cardPoolListInput.parse({ query: '%_' }))).pools.map(
          p => p.poolId,
        ),
      ).toEqual([ids[0]!]);
      const pages = await Promise.all(
        [0, 1].map(offset => repo.list(users[0]!, cardPoolListInput.parse({ limit: 1, offset }))),
      );
      expect(new Set(pages.flatMap(page => page.pools.map(p => p.poolId))).size).toBe(2);
      const read = (id: string) =>
        repo.get(users[0]!, cardPoolGetInput.parse({ poolId: id }), 'https://example.invalid');
      const result = await read(ids[0]!);
      expect(result.totalPhysicalCards).toBe(5);
      expect(result.cards.find(card => card.cardId === 'coruscant-guard')).toMatchObject({
        quantity: 2,
        cardPoolNumbers: [2, 7],
        details: { name: 'Coruscant Guard', text: expect.any(String) },
      });
      expect(result.cards.find(card => card.cardId === 'archived-pool-card')).toMatchObject({
        quantity: 1,
        cardPoolNumbers: [35],
        catalogAvailable: false,
        details: null,
      });
      expect(
        result.cards.find(card => card.cardId === 'qui-gon-jinn--student-of-the-living-force')
          ?.details?.type,
      ).toContain('Leader');
      expect(result.previewCardIds).toEqual(['pool-preview-fixture']);
      expect(result.missingCardIds).toEqual(['archived-pool-card']);
      expect(result.basicBaseOptions.length).toBeGreaterThan(0);
      expect(result.basicBaseOptions.every(base => !('cardPoolNumbers' in base))).toBe(true);
      expect(result.pool.description?.length).toBe(4000);
      expect(result.pool.descriptionTruncated).toBe(true);
      expect(JSON.stringify(result)).not.toContain(users[0]!);
      expect((await read(ids[1]!)).totalPhysicalCards).toBe(0);
      expect((await read(ids[2]!)).pool.archivedAt).not.toBeNull();
      for (const id of [ids[3]!, crypto.randomUUID()])
        await expect(read(id)).rejects.toMatchObject({ status: 404 });
      expect((await read(ids[4]!)).cards.map(c => c.cardId)).toEqual(['rebel-assault']);
      expect((await read(ids[5]!)).pool.visibility).toBe('unlisted');
      await db.insert(cardPoolCards).values(
        Array.from({ length: 1001 }, (_, i) => ({
          cardPoolId: ids[1]!,
          cardPoolNumber: i + 1,
          cardId: 'coruscant-guard',
        })),
      );
      await expect(read(ids[1]!)).rejects.toMatchObject({ status: 413 });
      for (const tool of createCardPoolTools(repo)) {
        let admitted = false;
        expect(
          await tool.invoke(
            {},
            {
              actor: { userId: users[0]!, clientId: 'test', scopes: ['cards:read'] },
              websiteOrigin: 'https://example.invalid',
            },
            async (_name, work) => {
              admitted = true;
              return toolSuccess((await work()).data);
            },
          ),
        ).toMatchObject({ isError: true, structuredContent: { code: 'forbidden' } });
        expect(admitted).toBe(false);
      }
      for (const query of [
        'update card_pools set name = name where false',
        'delete from card_pool_cards where false',
        'select email from "user"',
      ])
        await expect(runtime.unsafe(query).execute()).rejects.toMatchObject({ code: '42501' });
    } finally {
      await runtime`reset role`;
      await runtime.end();
      await db.delete(cardPoolCards).where(inArray(cardPoolCards.cardPoolId, ids));
      await db.delete(cardPools).where(inArray(cardPools.id, ids));
      await db.delete(user).where(inArray(user.id, users));
      await admin`drop owned by ${admin(role)}`;
      await admin`drop role ${admin(role)}`;
      await admin.end();
    }
  },
  60000,
);

test('pool inputs reject forged ownership and unbounded or invalid requests', () => {
  expect(cardPoolListInput.safeParse({ userId: 'someone-else' }).success).toBe(false);
  expect(cardPoolListInput.safeParse({ limit: 26 }).success).toBe(false);
  expect(cardPoolListInput.safeParse({ offset: -1 }).success).toBe(false);
  expect(cardPoolListInput.safeParse({ visibility: 'secret' }).success).toBe(false);
  expect(
    cardPoolGetInput.safeParse({ poolId: crypto.randomUUID(), userId: 'someone-else' }).success,
  ).toBe(false);
});
