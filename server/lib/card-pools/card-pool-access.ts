import { and, eq, ne, or, SQL } from 'drizzle-orm';
import { db } from '../../db';
import { cardPools as cardPoolsTable } from '../../db/schema/card_pool.ts';

/**
 * Builds a visibility constraint for selecting a single card pool by id,
 * applying the same accessibility rules as other card pool endpoints.
 *
 * Rules:
 * - Unauthenticated: only non-private pools are visible
 * - Authenticated: owners can see any; others can see non-private
 */
export function buildCardPoolVisibilityWhere(
  id: string,
  user: { id: string } | null | undefined,
): SQL<unknown> {
  const base = eq(cardPoolsTable.id, id);
  if (!user) {
    return and(base, ne(cardPoolsTable.visibility, 'private'))!;
  }
  const visOrOwner = or(
    ne(cardPoolsTable.visibility, 'private'),
    eq(cardPoolsTable.userId, user.id),
  )!;
  return and(base, visOrOwner)!;
}

/**
 * Returns the card pool row if the given user has access to it per visibility rules; otherwise undefined.
 */
export async function getCardPoolBasedOnIdAndUser(
  id: string,
  user: { id: string } | null | undefined,
) {
  const [pool] = await db
    .select()
    .from(cardPoolsTable)
    .where(buildCardPoolVisibilityWhere(id, user))
    .limit(1);
  return pool;
}
