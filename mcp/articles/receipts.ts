import { createHash } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { mcpMutation } from '../../server/db/schema/mcp-mutation.ts';
import type { Database } from '../../server/lib/creators/types.ts';
import { CreatorError } from '../../server/lib/creators/errors.ts';

export type ArticleActor = { userId: string; clientId: string; scopes: string[] };
export function inputHash(value: unknown): string {
  const stable = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(stable)
      : value && typeof value === 'object'
        ? Object.fromEntries(
            Object.entries(value)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, value]) => [key, stable(value)]),
          )
        : value;
  return createHash('sha256')
    .update(JSON.stringify(stable(value)))
    .digest('hex');
}

// Committed receipts are immutable. A read before preparing dependencies keeps
// successful retries available even while image storage/catalog reads are down.
// A missing receipt still goes through mutation's advisory lock and recheck.
export async function readMutationReceipt<T extends Record<string, unknown>>(
  database: Database,
  actor: ArticleActor,
  tool: string,
  requestId: string,
  input: unknown,
  replay: (db: Database, result: Record<string, unknown>) => Promise<void>,
): Promise<T | undefined> {
  const [saved] = await database
    .select()
    .from(mcpMutation)
    .where(
      and(
        eq(mcpMutation.userId, actor.userId),
        eq(mcpMutation.clientId, actor.clientId),
        eq(mcpMutation.requestId, requestId),
      ),
    );
  if (!saved) return undefined;
  if (saved.tool !== tool || saved.inputHash !== inputHash(input))
    throw new CreatorError('This requestId was already used with different input.', 409);
  await replay(database, saved.result);
  return saved.result as T;
}
export async function mutation<T extends Record<string, unknown>>(
  database: Database,
  actor: ArticleActor,
  tool: string,
  requestId: string,
  input: unknown,
  work: (tx: Database) => Promise<T>,
  replay: (tx: Database, result: Record<string, unknown>) => Promise<void>,
): Promise<T> {
  const hash = inputHash(input);
  return database.transaction(async tx => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${JSON.stringify([actor.userId, actor.clientId, requestId])}, 1))`,
    );
    const key = and(
      eq(mcpMutation.userId, actor.userId),
      eq(mcpMutation.clientId, actor.clientId),
      eq(mcpMutation.requestId, requestId),
    );
    const [saved] = await tx.select().from(mcpMutation).where(key);
    if (saved) {
      if (saved.tool !== tool || saved.inputHash !== hash)
        throw new CreatorError('This requestId was already used with different input.', 409);
      await replay(tx, saved.result);
      return saved.result as T;
    }
    const result = await work(tx);
    await tx.insert(mcpMutation).values({
      userId: actor.userId,
      clientId: actor.clientId,
      requestId,
      tool,
      inputHash: hash,
      result,
    });
    return result;
  });
}
