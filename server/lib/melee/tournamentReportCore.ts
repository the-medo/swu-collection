import type { Database } from '../creators/types.ts';
import { and, eq, inArray, or, sql } from 'drizzle-orm';
import { meleeConnection } from '../../db/schema/melee_connection.ts';
import { tournamentDeck } from '../../db/schema/tournament_deck.ts';
import { tournament } from '../../db/schema/tournament.ts';
import { tournamentMatch } from '../../db/schema/tournament_match.ts';
import { deck } from '../../db/schema/deck.ts';
import { deckCard } from '../../db/schema/deck_card.ts';
import { createMeleeTournamentService } from './tournamentsCore.ts';
import { findTournamentParticipant } from './tournamentDeck.ts';
import { MeleeConnectionError } from './profile.ts';
import { reportRounds } from './reportRounds.ts';
import { fetchMeleePlayerReport } from './playerReport.ts';
import type {
  TournamentReport,
  TournamentReportDeck,
} from '../../../shared/types/TournamentReport.ts';

export function createTournamentReportService(
  database: Database,
  fetchPlayerReport = fetchMeleePlayerReport,
) {
  const history = createMeleeTournamentService(database);
  return {
    async get(userId: string, tournamentId: string): Promise<TournamentReport> {
      const saved = await history.get(userId);
      const [connection] = await database
        .select()
        .from(meleeConnection)
        .where(eq(meleeConnection.userId, userId));
      if (!saved.connected || !connection)
        throw new MeleeConnectionError(
          'Connect your Melee account to use your tournament history.',
          409,
        );
      const event = saved.tournaments.find(row => row.tournamentId === tournamentId);
      if (!event)
        throw new MeleeConnectionError(
          'This tournament is not in your Melee history. Refresh your tournaments and try again.',
          404,
        );

      const candidates = await database
        .select({
          id: deck.id,
          name: deck.name,
          visibility: deck.public,
          username: tournamentDeck.meleePlayerUsername,
          placement: tournamentDeck.placement,
        })
        .from(tournamentDeck)
        .innerJoin(deck, eq(tournamentDeck.deckId, deck.id))
        .where(
          and(
            eq(tournamentDeck.tournamentId, tournamentId),
            or(
              sql`lower(${tournamentDeck.meleePlayerUsername}) = ${connection.username.toLowerCase()}`,
              event.completed && event.placement && event.placement > 0
                ? eq(tournamentDeck.placement, event.placement)
                : undefined,
            ),
          ),
        );
      // Keep private candidates in the identity/ambiguity check, but never expose their cards.
      const participant = findTournamentParticipant(
        candidates,
        connection.username,
        event.completed ? event.placement : null,
      );
      const matches = participant
        ? await database
            .select()
            .from(tournamentMatch)
            .where(
              and(
                eq(tournamentMatch.tournamentId, tournamentId),
                or(
                  eq(tournamentMatch.p1DeckId, participant.id),
                  eq(tournamentMatch.p2DeckId, participant.id),
                ),
              ),
            )
        : [];
      const ids = [
        ...new Set(
          [participant?.id, ...matches.flatMap(row => [row.p1DeckId, row.p2DeckId])].filter(
            (id): id is string => !!id,
          ),
        ),
      ];
      const publicDecks: TournamentReportDeck[] = ids.length
        ? await database
            .select({
              id: deck.id,
              name: deck.name,
              leaderId: deck.leaderCardId1,
              baseId: deck.baseCardId,
              hasDecklist: sql<boolean>`exists(select 1 from ${deckCard} where ${deckCard.deckId} = ${deck.id} and ${deckCard.board} = 1 and ${deckCard.quantity} > 0)`,
            })
            .from(deck)
            .where(and(inArray(deck.id, ids), eq(deck.public, 1)))
        : [];
      const decks = new Map(publicDecks.map(row => [row.id, row]));
      let rounds = participant ? reportRounds(matches, participant.id, decks) : [];
      let roundsWarning: string | undefined;
      if (!rounds.length) {
        try {
          rounds = await fetchPlayerReport(event.meleeId, connection.username);
        } catch (error) {
          if (!(error instanceof MeleeConnectionError)) throw error;
          roundsWarning = error.message;
        }
      }
      // Auto-fill meta only when imported public card lists exist, independently
      // of whether this author's deck matched. This is deliberately stricter than
      // the manual meta widget, which also supports leader/base-only entries.
      const metaDecks = await database
        .select({ id: deck.id })
        .from(tournamentDeck)
        .innerJoin(tournament, eq(tournament.id, tournamentDeck.tournamentId))
        .innerJoin(deck, eq(deck.id, tournamentDeck.deckId))
        .where(
          and(
            eq(tournamentDeck.tournamentId, tournamentId),
            eq(tournament.imported, true),
            eq(deck.public, 1),
            sql`exists(select 1 from ${deckCard} where ${deckCard.deckId} = ${deck.id} and ${deckCard.board} = 1 and ${deckCard.quantity} > 0)`,
          ),
        )
        .limit(1);
      return {
        tournament: {
          id: tournamentId,
          name: event.name,
          date: event.date,
          format: event.format,
          attendance: event.attendance,
          placement: event.placement,
          record: event.record,
          completed: event.completed,
        },
        deck: participant ? (decks.get(participant.id) ?? null) : null,
        rounds,
        ...(roundsWarning ? { roundsWarning } : {}),
        hasMetaDecks: metaDecks.length > 0,
      };
    },
  };
}
