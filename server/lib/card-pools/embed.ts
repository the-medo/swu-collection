import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '../../db';
import { cardPools } from '../../db/schema/card_pool.ts';
import type { CardPoolEmbed } from '../../../shared/types/cardPoolEmbed.ts';

export async function getCardPoolEmbed(id: string): Promise<CardPoolEmbed | null> {
  // Article embeds have the same visibility for owners and anonymous readers.
  const [pool] = await db
    .select({
      id: cardPools.id,
      name: cardPools.name,
      set: cardPools.set,
      type: cardPools.type,
      leaders: cardPools.leaders,
      custom: cardPools.custom,
      edited: cardPools.edited,
    })
    .from(cardPools)
    .where(
      and(
        eq(cardPools.id, id),
        inArray(cardPools.visibility, ['public', 'unlisted']),
        inArray(cardPools.type, ['sealed', 'prerelease']),
        eq(cardPools.status, 'ready'),
        isNull(cardPools.archivedAt),
      ),
    )
    .limit(1);
  if (!pool) return null;
  const leaders = new Map<string, number>();
  for (const cardId of (pool.leaders ?? '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean))
    leaders.set(cardId, (leaders.get(cardId) ?? 0) + 1);
  return {
    id: pool.id,
    name: pool.name?.trim() || 'Sealed pool',
    set: pool.set,
    leaders: [...leaders].map(([cardId, copies]) => ({ cardId, copies })),
    // Generated sealed packs each supply one leader. Prerelease pools also
    // include fixed leaders; custom/edited pools have no reliable pack count.
    boosterCount:
      pool.type === 'sealed' && !pool.custom && !pool.edited && leaders.size
        ? [...leaders.values()].reduce((sum, copies) => sum + copies, 0)
        : null,
  };
}
