import { z } from 'zod';
import { and, asc, count, countDistinct, eq, gt, gte, lte, sql } from 'drizzle-orm';
import type { Database } from '../server/lib/creators/types.ts';
import { user } from '../server/db/schema/auth-schema.ts';
import { mcpToolUsage } from '../server/db/schema/mcp-usage.ts';
import { MCP_RESOURCE_SCOPES, MCP_SCOPE_DESCRIPTIONS } from '../shared/mcp/config.ts';
import type { ArticleActor } from './articles/receipts.ts';
import { ToolFailure } from './tools/results.ts';

export const mcpAccessInput = z.strictObject({});
export const mcpUsageInput = z.strictObject({
  days: z.number().int().min(1).max(90).default(7),
  clients: z.enum(['current', 'all']).default('current'),
  tool: z.string().trim().min(1).max(120).optional(),
  groupBy: z.enum(['tool', 'client', 'day']).default('tool'),
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).max(10000).default(0),
});
const aggregates = () => ({
  calls: count(),
  successfulCalls: sql<number>`count(*) filter (where ${mcpToolUsage.outcome} = 'success')`.mapWith(
    Number,
  ),
  failedCalls: sql<number>`count(*) filter (where ${mcpToolUsage.outcome} = 'error')`.mapWith(
    Number,
  ),
  unfinishedCalls: sql<number>`count(*) filter (where ${mcpToolUsage.outcome} = 'started')`.mapWith(
    Number,
  ),
  resultCount: sql<number>`coalesce(sum(${mcpToolUsage.resultCount}), 0)`.mapWith(Number),
  durationMs: sql<number>`coalesce(sum(${mcpToolUsage.durationMs}), 0)`.mapWith(Number),
  averageDurationMs: sql<number | null>`avg(${mcpToolUsage.durationMs})`.mapWith(Number),
});
const snapshotOptions = { isolationLevel: 'repeatable read', accessMode: 'read only' } as const;

export function createAccountRepository(
  database: Database,
  resource: string,
  callsPerMinute: number,
) {
  async function account(tx: Database, userId: string) {
    const [row] = await tx
      .select({
        displayName: user.displayName,
        asOf: sql<Date>`now()`.mapWith((value: string | Date) => new Date(value)),
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    if (!row) throw new ToolFailure('Account unavailable.', 404);
    return row;
  }
  return {
    async access(actor: ArticleActor) {
      return database.transaction(async tx => {
        const current = await account(tx, actor.userId);
        const [recent] = await tx
          .select({ calls: count() })
          .from(mcpToolUsage)
          .where(
            and(
              eq(mcpToolUsage.userId, actor.userId),
              gt(mcpToolUsage.startedAt, sql`now() - interval '1 minute'`),
            ),
          );
        return {
          account: { displayName: current.displayName },
          clientId: actor.clientId,
          resource,
          asOf: current.asOf.toISOString(),
          permissions: MCP_RESOURCE_SCOPES.map(scope => ({
            scope,
            description: MCP_SCOPE_DESCRIPTIONS[scope],
            granted: actor.scopes.includes(scope),
          })),
          rateLimit: {
            callsPerMinute,
            windowSeconds: 60,
            used: recent!.calls,
            remaining: Math.max(0, callsPerMinute - recent!.calls),
            sharedAcrossClients: true,
          },
          guidance:
            'Granted permissions are the intersection of this access token and current live consent. Reconnect and approve a missing scope to use it. Resource ownership, membership and state checks still apply; scope permission alone does not grant access to every resource. This call consumes usage and is included in the rolling per-user limit; remaining capacity is a snapshot, not a reservation.',
        };
      }, snapshotOptions);
    },
    async usage(actor: ArticleActor, input: z.infer<typeof mcpUsageInput>) {
      return database.transaction(async tx => {
        const { asOf } = await account(tx, actor.userId);
        const since = new Date(asOf.getTime() - input.days * 86400000);
        const filter = and(
          eq(mcpToolUsage.userId, actor.userId),
          gte(mcpToolUsage.startedAt, since),
          lte(mcpToolUsage.startedAt, asOf),
          input.clients === 'current' ? eq(mcpToolUsage.clientId, actor.clientId) : undefined,
          input.tool ? eq(mcpToolUsage.tool, input.tool) : undefined,
        );
        const key =
          input.groupBy === 'day'
            ? sql<string>`to_char(${mcpToolUsage.startedAt} at time zone 'UTC', 'YYYY-MM-DD')`
            : input.groupBy === 'client'
              ? mcpToolUsage.clientId
              : mcpToolUsage.tool;
        const [totals] = await tx
          .select({ ...aggregates(), totalGroups: countDistinct(key) })
          .from(mcpToolUsage)
          .where(filter);
        const groups = await tx
          .select({ key, ...aggregates() })
          .from(mcpToolUsage)
          .where(filter)
          .groupBy(key)
          .orderBy(asc(key))
          .limit(input.limit)
          .offset(input.offset);
        const { totalGroups, ...summary } = totals!;
        return {
          from: since.toISOString(),
          to: asOf.toISOString(),
          timezone: 'UTC',
          clients: input.clients,
          currentClientId: actor.clientId,
          tool: input.tool ?? null,
          groupBy: input.groupBy,
          limit: input.limit,
          offset: input.offset,
          totalGroups,
          totals: summary,
          groups,
          accounting:
            'Counts admitted tool calls, including failures and this reporting call when it matches the filters. Discovery, authentication/scope failures and rate-limit denials are not recorded. Unfinished calls have no final outcome and may include interrupted requests. Result counts have tool-specific units; duration is server execution time, not tokens, model cost or billing. Totals cover all matching groups, independent of pagination. Deleted clients may remain as historical IDs.',
        };
      }, snapshotOptions);
    },
  };
}
export type AccountRepository = ReturnType<typeof createAccountRepository>;
