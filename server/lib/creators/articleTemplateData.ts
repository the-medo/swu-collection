import { and, desc, eq, inArray, lte, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { meta } from '../../db/schema/meta.ts';
import { tournament } from '../../db/schema/tournament.ts';
import { tournamentType } from '../../db/schema/tournament_type.ts';
import { tournamentDeck } from '../../db/schema/tournament_deck.ts';
import { tournamentGroup } from '../../db/schema/tournament_group.ts';
import { tournamentGroupTournament } from '../../db/schema/tournament_group_tournament.ts';
import { deck } from '../../db/schema/deck.ts';
import { deckCard } from '../../db/schema/deck_card.ts';
import { CreatorError } from './errors.ts';
import { summarizeTemplateMeta } from './templateMetaSummary.ts';
import type { Connection } from './types.ts';
import type { TemplateMeta } from '../../../shared/types/ArticleTemplates.ts';

export type TemplateMetaInput =
  | { scope: 'current'; format: number }
  | { scope: 'tournament' | 'group'; id: string };

export async function getArticleTemplateMeta(
  input: TemplateMetaInput,
  database: Connection = db,
  now = new Date(),
): Promise<TemplateMeta> {
  const today = now.toISOString().slice(0, 10);
  let source: TemplateMeta['source'];
  let filter;
  if (input.scope === 'current') {
    const [current] = await database
      .select()
      .from(meta)
      .where(and(eq(meta.format, input.format), lte(meta.date, today)))
      .orderBy(desc(meta.date), desc(meta.id))
      .limit(1);
    if (!current)
      return summarizeTemplateMeta(
        { scope: 'current', id: '', name: 'Current meta unavailable' },
        [],
        [],
        today,
      );
    source = { scope: 'current', id: String(current.id), name: current.name };
    // Match the Meta page's default PQ-and-higher field, without future events.
    filter = and(
      eq(tournament.meta, current.id),
      eq(tournament.format, input.format),
      sql`${tournamentType.sortValue} >= 200`,
      sql`${tournament.date} <= ${today}::date`,
    );
  } else if (input.scope === 'group') {
    const [group] = await database
      .select()
      .from(tournamentGroup)
      .where(and(eq(tournamentGroup.id, input.id), eq(tournamentGroup.visible, true)))
      .limit(1);
    if (!group) throw new CreatorError('Tournament group not found.', 404);
    source = { scope: 'group', id: group.id, name: group.name };
    filter = inArray(
      tournament.id,
      database
        .select({ id: tournamentGroupTournament.tournamentId })
        .from(tournamentGroupTournament)
        .where(eq(tournamentGroupTournament.groupId, input.id)),
    );
  } else {
    const [event] = await database
      .select({ name: tournament.name })
      .from(tournament)
      .where(eq(tournament.id, input.id))
      .limit(1);
    if (!event) throw new CreatorError('Tournament not found.', 404);
    source = { scope: 'tournament', id: input.id, name: event.name };
    filter = eq(tournament.id, input.id);
  }
  const events = await database
    .select({
      id: tournament.id,
      name: tournament.name,
      date: sql<string>`${tournament.date}::text`,
      attendance: tournament.attendance,
      imported: tournament.imported,
    })
    .from(tournament)
    .innerJoin(tournamentType, eq(tournament.type, tournamentType.id))
    .where(filter)
    .orderBy(desc(tournament.date), tournament.id);
  const imported = events
    .filter(event => event.imported && event.date <= today)
    .map(event => event.id);
  const rows = imported.length
    ? await database
        .select({
          id: deck.id,
          name: deck.name,
          leaderId: deck.leaderCardId1,
          baseId: deck.baseCardId,
          tournamentId: tournamentDeck.tournamentId,
          placement: tournamentDeck.placement,
          hasDecklist: sql<boolean>`exists (select 1 from ${deckCard} where ${deckCard.deckId} = ${deck.id} and ${deckCard.board} = 1 and ${deckCard.quantity} > 0)`,
        })
        .from(tournamentDeck)
        .innerJoin(deck, and(eq(deck.id, tournamentDeck.deckId), eq(deck.public, 1)))
        .where(inArray(tournamentDeck.tournamentId, imported))
    : [];
  return summarizeTemplateMeta(source, events, rows, today);
}
