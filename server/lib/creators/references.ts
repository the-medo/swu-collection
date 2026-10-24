import { and, eq, exists, inArray, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { deck } from '../../db/schema/deck.ts';
import { tournament } from '../../db/schema/tournament.ts';
import { creation, creationReference } from '../../db/schema/creator_hub.ts';
import { creatorClaimedDeck } from '../../db/schema/creator_video_job.ts';
import { getMergedCardList, type CardCatalogReader } from '../cards/cardListProvider.ts';
import { setInfo } from '../../../lib/swu-resources/set-info.ts';
import type {
  EntityReference,
  ResolvedReference,
  ConnectionSubject,
} from '../../../shared/creators/contracts.ts';
import type { Connection } from './types.ts';
const uuid = (id: string) => z.uuid().safeParse(id).success;

export type { ResolvedReference } from '../../../shared/creators/contracts.ts';
export const referenceKey = (ref: EntityReference) => `${ref.type}:${ref.id}`;
type ReferenceScope = { creatorId?: string; ownerId?: string | null };

/** Unlisted decks are not subjects for general discovery. A creator can explicitly
 * link their own; existing shared video links survive a system-deck claim. */
export function referenceDeckAccess(database: Connection, scope: ReferenceScope = {}) {
  if (!scope.ownerId && !scope.creatorId) return eq(deck.public, 1);
  return or(
    eq(deck.public, 1),
    and(
      eq(deck.public, 2),
      or(
        scope.ownerId ? eq(deck.userId, scope.ownerId) : undefined,
        scope.creatorId
          ? and(
              exists(
                database
                  .select({ id: creatorClaimedDeck.deckId })
                  .from(creatorClaimedDeck)
                  .where(and(eq(creatorClaimedDeck.deckId, deck.id))),
              ),
              exists(
                database
                  .select({ id: creationReference.creationId })
                  .from(creationReference)
                  .innerJoin(creation, eq(creation.id, creationReference.creationId))
                  .where(
                    and(
                      eq(creation.creatorId, scope.creatorId),
                      eq(creationReference.entityType, 'deck'),
                      eq(creationReference.entityId, sql`${deck.id}::text`),
                    ),
                  ),
              ),
            )
          : undefined,
      ),
    ),
  );
}

/** Each response resolves database-backed subjects in at most two queries. */
export async function resolveReferences(
  refs: EntityReference[],
  database?: Connection,
  catalog: CardCatalogReader = getMergedCardList,
  scope: ReferenceScope = {},
): Promise<ResolvedReference[]> {
  database ??= (await import('../../db/index.ts')).db;
  const ids = (type: EntityReference['type']) => [
    ...new Set(refs.filter(r => r.type === type && uuid(r.id)).map(r => r.id)),
  ];
  const deckIds = ids('deck'),
    tournamentIds = ids('tournament');
  const [decks, tournaments, cards] = await Promise.all([
    deckIds.length
      ? database
          .select({
            id: deck.id,
            name: deck.name,
            leaderId: deck.leaderCardId1,
            leader2Id: deck.leaderCardId2,
            baseId: deck.baseCardId,
          })
          .from(deck)
          .where(and(inArray(deck.id, deckIds), referenceDeckAccess(database, scope)))
      : [],
    tournamentIds.length
      ? database
          .select({
            id: tournament.id,
            name: tournament.name,
            date: sql<string>`${tournament.date}::text`,
            location: tournament.location,
          })
          .from(tournament)
          .where(inArray(tournament.id, tournamentIds))
      : [],
    refs.some(ref => ['card', 'leader', 'base'].includes(ref.type)) ? catalog() : undefined,
  ]);
  const deckNames = new Map(decks.map(row => [row.id, row]));
  const tournamentNames = new Map(tournaments.map(row => [row.id, row]));
  return refs.flatMap(ref => {
    const result = (label: string, href: string, details: Partial<ConnectionSubject> = {}) => [
      { ...ref, ...details, label, href },
    ];
    if (ref.type === 'deck') {
      const row = deckNames.get(ref.id);
      return row
        ? result(row.name, `/decks/${ref.id}`, {
            leaderId: row.leaderId,
            leader2Id: row.leader2Id,
            baseId: row.baseId,
          })
        : [];
    }
    if (ref.type === 'tournament') {
      const row = tournamentNames.get(ref.id);
      return row
        ? result(row.name, `/tournaments/${ref.id}`, { date: row.date, location: row.location })
        : [];
    }
    if (ref.type === 'set') {
      const info = Object.values(setInfo).find(set => set.code === ref.id);
      return info
        ? result(
            info.name,
            `/cards/sets/${encodeURIComponent(ref.id)}?csCategory=all&csVariant=standard`,
            { date: info.releaseDate },
          )
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
export async function resolveReference(ref: EntityReference, database?: Connection) {
  return (await resolveReferences([ref], database))[0] ?? null;
}
