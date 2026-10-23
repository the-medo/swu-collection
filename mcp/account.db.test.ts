import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { inArray } from 'drizzle-orm';
import { user } from '../server/db/schema/auth-schema.ts';
import { mcpToolUsage } from '../server/db/schema/mcp-usage.ts';
import { createAccountRepository, mcpAccessInput, mcpUsageInput } from './account.ts';

const enabled = process.env.SWUBASE_MCP_DB_TEST === '1';
test.skipIf(!enabled)(
  'restricted account reports isolate users/clients, count outcomes and windows, and paginate complete totals',
  async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_'))
      throw new Error('Use an isolated worktree database.');
    const admin = postgres(target.href, { max: 2 }),
      runtime = postgres(target.href, { max: 1 });
    const db = drizzle(admin),
      limited = drizzle(runtime);
    const users = ['mcp-account-' + crypto.randomUUID(), 'mcp-account-' + crypto.randomUUID()];
    const role = 'mcp_account_' + crypto.randomUUID().replaceAll('-', '');
    const actor = { userId: users[0]!, clientId: 'client-a', scopes: ['cards:read', 'usage:read'] };
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
      await runtime`set time zone 'Pacific/Honolulu'`;
      await db
        .insert(user)
        .values(
          users.map(id => ({
            id,
            name: 'PRIVATE LEGAL NAME',
            displayName: id,
            email: id + '@invalid.local',
            emailVerified: false,
            currency: 'USD',
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
        );
      const [{ now }] = await admin`select now()`;
      const time = new Date(now).getTime();
      const at = (ago: number) => new Date(time - ago);
      const day = 86400000;
      const rows: (typeof mcpToolUsage.$inferInsert)[] = [
        {
          userId: users[0]!,
          clientId: 'client-a',
          tool: 'search_cards',
          startedAt: at(30000),
          outcome: 'success',
          resultCount: 3,
          durationMs: 100,
        },
        {
          userId: users[0]!,
          clientId: 'client-a',
          tool: 'get_deck',
          startedAt: at(20000),
          outcome: 'error',
          resultCount: 0,
          durationMs: 50,
        },
        { userId: users[0]!, clientId: 'client-a', tool: 'get_my_mcp_usage', startedAt: at(10000) },
        {
          userId: users[0]!,
          clientId: 'client-a',
          tool: 'search_cards',
          startedAt: at(2 * day),
          outcome: 'success',
          resultCount: 5,
          durationMs: 200,
        },
        {
          userId: users[0]!,
          clientId: 'client-a',
          tool: 'search_cards',
          startedAt: at(8 * day),
          outcome: 'success',
          resultCount: 99,
          durationMs: 999,
        },
        {
          userId: users[0]!,
          clientId: 'deleted-client-b',
          tool: 'get_cards',
          startedAt: at(5000),
          outcome: 'success',
          resultCount: 7,
          durationMs: 300,
        },
        {
          userId: users[1]!,
          clientId: 'client-a',
          tool: 'PRIVATE FOREIGN TOOL',
          startedAt: at(4000),
          outcome: 'success',
          resultCount: 9999,
          durationMs: 9999,
        },
      ];
      await db.insert(mcpToolUsage).values(rows);
      const repo = createAccountRepository(limited, 'https://mcp.example.invalid/mcp', 5);
      const access = await repo.access(actor);
      expect(access).toMatchObject({
        account: { displayName: users[0] },
        clientId: 'client-a',
        rateLimit: { callsPerMinute: 5, used: 4, remaining: 1, sharedAcrossClients: true },
        permissions: expect.arrayContaining([
          expect.objectContaining({ scope: 'usage:read', granted: true }),
          expect.objectContaining({ scope: 'decks:write', granted: false }),
        ]),
      });
      expect(JSON.stringify(access)).not.toContain('PRIVATE');
      expect(JSON.stringify(access)).not.toContain('@invalid.local');
      const own = await repo.usage(actor, mcpUsageInput.parse({}));
      expect(own).toMatchObject({
        clients: 'current',
        totalGroups: 3,
        totals: {
          calls: 4,
          successfulCalls: 2,
          failedCalls: 1,
          unfinishedCalls: 1,
          resultCount: 8,
          durationMs: 350,
        },
      });
      expect(own.totals.averageDurationMs).toBeCloseTo(350 / 3);
      expect(JSON.stringify(own)).not.toContain('PRIVATE FOREIGN TOOL');
      const all = await repo.usage(
        actor,
        mcpUsageInput.parse({ clients: 'all', groupBy: 'client' }),
      );
      expect(all).toMatchObject({
        totalGroups: 2,
        totals: { calls: 5, resultCount: 15, durationMs: 650 },
      });
      expect(all.groups.map(group => group.key)).toEqual(['client-a', 'deleted-client-b']);
      const page = await repo.usage(actor, mcpUsageInput.parse({ limit: 1, offset: 1 }));
      expect(page.groups).toHaveLength(1);
      expect(page.totalGroups).toBe(own.totalGroups);
      expect(page.totals).toEqual(own.totals);
      expect(page.groups[0]).toEqual(own.groups[1]);
      const empty = await repo.usage(actor, mcpUsageInput.parse({ tool: 'absent-tool' }));
      expect(empty).toMatchObject({
        groups: [],
        totalGroups: 0,
        totals: { calls: 0, resultCount: 0, durationMs: 0, averageDurationMs: null },
      });
      const filtered = await repo.usage(
        actor,
        mcpUsageInput.parse({ clients: 'all', tool: 'get_cards' }),
      );
      expect(filtered.totals.calls).toBe(1);
      expect(filtered.totals.resultCount).toBe(7);
      expect((await repo.usage(actor, mcpUsageInput.parse({ days: 90 }))).totals.calls).toBe(5);
      const byDay = await repo.usage(actor, mcpUsageInput.parse({ groupBy: 'day' }));
      const expected = new Map<string, number>();
      for (const row of rows.slice(0, 4)) {
        const key = (row.startedAt as Date).toISOString().slice(0, 10);
        expected.set(key, (expected.get(key) ?? 0) + 1);
      }
      expect(byDay.groups.map(group => [group.key, group.calls])).toEqual(
        [...expected].sort(([a], [b]) => a.localeCompare(b)),
      );
      await db
        .insert(mcpToolUsage)
        .values({
          userId: users[0]!,
          clientId: 'client-a',
          tool: 'future-fixture',
          startedAt: at(-day),
          outcome: 'success',
          resultCount: 10000,
        });
      expect((await repo.usage(actor, mcpUsageInput.parse({ clients: 'all' }))).totals).toEqual(
        all.totals,
      );
      for (const query of [
        'select email from "user"',
        'select token from session',
        'select client_secret from oauth_client',
        'update mcp_tool_usage set client_id = client_id where false',
        'delete from mcp_tool_usage where false',
      ])
        await expect(runtime.unsafe(query).execute()).rejects.toMatchObject({ code: '42501' });
    } finally {
      await runtime`reset role`;
      await runtime.end();
      await db.delete(user).where(inArray(user.id, users));
      await admin`drop owned by ${admin(role)}`;
      await admin`drop role ${admin(role)}`;
      await admin.end();
    }
  },
  60000,
);

test('account inputs cannot select another user or unbounded reporting periods', () => {
  expect(mcpAccessInput.safeParse({ userId: 'foreign' }).success).toBe(false);
  for (const input of [
    { userId: 'foreign' },
    { days: 91 },
    { days: 0 },
    { limit: 101 },
    { offset: -1 },
    { groupBy: 'raw_sql' },
    { clients: 'foreign-id' },
  ])
    expect(mcpUsageInput.safeParse(input).success).toBe(false);
});
