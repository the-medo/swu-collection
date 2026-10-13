import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.ts';
import { deck } from '../../db/schema/deck.ts';
import { tournament } from '../../db/schema/tournament.ts';
import { getMergedCardList } from '../cards/cardListProvider.ts';
import { setInfo } from '../../../lib/swu-resources/set-info.ts';
import type { EntityReference } from '../../../shared/creators/contracts.ts';
import type { Connection } from './types.ts';
const uuid = (id: string) => z.uuid().safeParse(id).success;

export type ResolvedReference = EntityReference & { label: string; href: string };
export const referenceKey = (ref: EntityReference) => `${ref.type}:${ref.id}`;

/** Each response resolves database-backed subjects in at most two queries. */
export async function resolveReferences(
  refs: EntityReference[],
  database: Connection = db,
): Promise<ResolvedReference[]> {
  const ids = (type: EntityReference['type']) => [
    ...new Set(refs.filter(r => r.type === type && uuid(r.id)).map(r => r.id)),
  ];
  const deckIds = ids('deck'),
    tournamentIds = ids('tournament');
  const [decks, tournaments, cards] = await Promise.all([
    deckIds.length
      ? database
          .select({ id: deck.id, name: deck.name })
          .from(deck)
          .where(and(inArray(deck.id, deckIds), eq(deck.public, 1)))
      : [],
    tournamentIds.length
      ? database
          .select({ id: tournament.id, name: tournament.name })
          .from(tournament)
          .where(inArray(tournament.id, tournamentIds))
      : [],
    refs.some(ref => ['card', 'leader', 'base'].includes(ref.type))
      ? getMergedCardList()
      : undefined,
  ]);
  const deckNames = new Map(decks.map(row => [row.id, row.name]));
  const tournamentNames = new Map(tournaments.map(row => [row.id, row.name]));
  return refs.flatMap(ref => {
    const result = (label: string, href: string) => [{ ...ref, label, href }];
    if (ref.type === 'deck')
      return deckNames.has(ref.id) ? result(deckNames.get(ref.id)!, `/decks/${ref.id}`) : [];
    if (ref.type === 'tournament')
      return tournamentNames.has(ref.id)
        ? result(tournamentNames.get(ref.id)!, `/tournaments/${ref.id}`)
        : [];
    if (ref.type === 'set') {
      const info = Object.values(setInfo).find(set => set.code === ref.id);
      return info
        ? result(info.name, `/content?entityType=set&entityId=${encodeURIComponent(ref.id)}`)
        : [];
    }
    const card = cards?.[ref.id];
    if (
      !card ||
      (ref.type === 'leader' && card.type !== 'Leader') ||
      (ref.type === 'base' && card.type !== 'Base')
    )
      return [];
    return result(
      `${card.name}${card.subtitle ? ` — ${card.subtitle}` : ''}`,
      `/cards/detail/${encodeURIComponent(ref.id)}`,
    );
  });
}
export async function resolveReference(ref: EntityReference, database: Connection = db) {
  return (await resolveReferences([ref], database))[0] ?? null;
}
