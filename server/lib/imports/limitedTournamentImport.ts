import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db';
import { tournament, type Tournament } from '../../db/schema/tournament.ts';
import { tournamentMatch } from '../../db/schema/tournament_match.ts';
import { tournamentDeck } from '../../db/schema/tournament_deck.ts';
import { fetchRoundMatches, type TournamentViewRound } from './tournamentImportLib.ts';
import { buildLimitedTournamentMatches } from './limitedTournamentMatches.ts';
import { batchArray } from '../utils/batch.ts';

export async function importLimitedTournamentMatches(
  event: Tournament,
  availableRounds: TournamentViewRound[],
  options: { forcedRoundId?: string; rounds: number[] },
) {
  if (!availableRounds.length) throw new Error('No Melee rounds available for limited import');
  const forcedRound = options.forcedRoundId
    ? availableRounds.find(round => round.id === Number(options.forcedRoundId))
    : undefined;
  if (options.forcedRoundId && !forcedRound) throw new Error('Forced Melee round was not found');

  const selectedRounds = new Set(options.rounds);
  const rounds = availableRounds.filter(
    round => round.started && (!forcedRound || round.number <= forcedRound.number),
  );
  if (forcedRound && !forcedRound.started) throw new Error('Forced Melee round has not started');
  if (new Set(rounds.map(round => round.number)).size !== rounds.length) {
    throw new Error('Ambiguous Melee round numbers; existing matches were not changed');
  }
  if (options.rounds.some(number => !rounds.some(round => round.number === number))) {
    throw new Error('A selected round is not available on Melee');
  }

  // Fetch earlier rounds as well for accurate pre-round points during partial imports.
  const lastRound = selectedRounds.size ? Math.max(...selectedRounds) : Infinity;
  const rawRounds = [];
  for (const round of rounds.filter(round => round.number <= lastRound)) {
    const matches = await fetchRoundMatches(round.id, { requireComplete: true });
    if (!matches.length) throw new Error(`No matches available for round ${round.number}`);
    rawRounds.push({ number: round.number, matches });
  }
  const matches = buildLimitedTournamentMatches(event.id, rawRounds).filter(
    match => !selectedRounds.size || selectedRounds.has(match.round),
  );
  if (!matches.length) throw new Error('No limited matches available to import');

  // Some limited events already have manually imported decks. Keep those links
  // without requiring or rebuilding decklists for the remaining players.
  const existingDecks = await db
    .select()
    .from(tournamentDeck)
    .where(eq(tournamentDeck.tournamentId, event.id));
  const deckByPlayer = new Map(existingDecks.map(row => [row.meleePlayerUsername, row.deckId]));
  for (const match of matches) {
    match.p1DeckId = deckByPlayer.get(match.p1Username) ?? null;
    match.p2DeckId = (match.p2Username && deckByPlayer.get(match.p2Username)) || null;
  }

  // Fetch and parse everything before replacing rows, then commit the replacement atomically.
  await db.transaction(async tx => {
    await tx
      .delete(tournamentMatch)
      .where(
        and(
          eq(tournamentMatch.tournamentId, event.id),
          selectedRounds.size ? inArray(tournamentMatch.round, [...selectedRounds]) : undefined,
        ),
      );
    for (const batch of batchArray(matches, 3500)) {
      await tx.insert(tournamentMatch).values(batch);
    }
    await tx
      .update(tournament)
      .set({ updatedAt: sql`NOW()` })
      .where(eq(tournament.id, event.id));
  });
}
