import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { AuthExtension } from '../../../../../../../auth/auth.ts';
import { requireAdmin } from '../../../../../../../auth/requireAdmin.ts';
import { db } from '../../../../../../../db';
import { tournament } from '../../../../../../../db/schema/tournament.ts';
import { tournamentDeck } from '../../../../../../../db/schema/tournament_deck.ts';
import { tournamentMatch } from '../../../../../../../db/schema/tournament_match.ts';
import { refreshTournamentResultsDerivedData, zTournamentRoundParams } from '../../../lib.ts';

type StandingIncrement = {
  recordWin: number;
  recordLose: number;
  recordDraw: number;
  points: number;
};

function addResult(
  increments: Map<string, StandingIncrement>,
  deckId: string,
  result: number,
): boolean {
  const increment = increments.get(deckId) ?? {
    recordWin: 0,
    recordLose: 0,
    recordDraw: 0,
    points: 0,
  };

  if (result === 3) {
    increment.recordWin += 1;
    increment.points += 3;
  } else if (result === 1) {
    increment.recordDraw += 1;
    increment.points += 1;
  } else if (result === 0) {
    increment.recordLose += 1;
  } else {
    return false;
  }

  increments.set(deckId, increment);
  return true;
}

function inverseResult(result: number): number {
  if (result === 3) return 0;
  if (result === 0) return 3;
  return result;
}

export const adminTournamentIdRoundApplyMatchesPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('param', zTournamentRoundParams),
  async c => {
    const admin = await requireAdmin(c);
    if (admin.response) return admin.response;

    const { tournamentId, round } = c.req.valid('param');

    const result = await db.transaction(async tx => {
      const selectedTournament = (
        await tx
          .select({ id: tournament.id, meta: tournament.meta })
          .from(tournament)
          .where(eq(tournament.id, tournamentId))
          .limit(1)
      )[0];

      if (!selectedTournament) return { type: 'tournament-not-found' as const };

      const matches = await tx
        .select()
        .from(tournamentMatch)
        .where(
          and(eq(tournamentMatch.tournamentId, tournamentId), eq(tournamentMatch.round, round)),
        );

      if (matches.length === 0) return { type: 'round-not-found' as const };

      const increments = new Map<string, StandingIncrement>();
      for (const match of matches) {
        if (!addResult(increments, match.p1DeckId, match.result)) {
          return { type: 'invalid-match-result' as const, matchId: match.id };
        }

        if (match.p2DeckId && !addResult(increments, match.p2DeckId, inverseResult(match.result))) {
          return { type: 'invalid-match-result' as const, matchId: match.id };
        }
      }

      const deckIds = [...increments.keys()];
      const standings = await tx
        .select({ deckId: tournamentDeck.deckId })
        .from(tournamentDeck)
        .where(
          and(
            eq(tournamentDeck.tournamentId, tournamentId),
            inArray(tournamentDeck.deckId, deckIds),
          ),
        );
      const standingDeckIds = new Set(standings.map(standing => standing.deckId));
      const missingDeckIds = deckIds.filter(deckId => !standingDeckIds.has(deckId));

      if (missingDeckIds.length > 0) {
        return { type: 'missing-standings' as const, missingDeckIds };
      }

      for (const [deckId, increment] of increments) {
        await tx
          .update(tournamentDeck)
          .set({
            recordWin: sql`${tournamentDeck.recordWin} + ${increment.recordWin}`,
            recordLose: sql`${tournamentDeck.recordLose} + ${increment.recordLose}`,
            recordDraw: sql`${tournamentDeck.recordDraw} + ${increment.recordDraw}`,
            points: sql`${tournamentDeck.points} + ${increment.points}`,
          })
          .where(
            and(eq(tournamentDeck.tournamentId, tournamentId), eq(tournamentDeck.deckId, deckId)),
          );
      }

      await tx
        .update(tournament)
        .set({ updatedAt: sql`NOW()` })
        .where(eq(tournament.id, tournamentId));

      return {
        type: 'success' as const,
        metaId: selectedTournament.meta,
        matchesApplied: matches.length,
        standingsUpdated: increments.size,
      };
    });

    if (result.type === 'tournament-not-found') {
      return c.json({ message: 'Tournament not found' }, 404);
    }

    if (result.type === 'round-not-found') {
      return c.json({ message: 'No matches found for this tournament round' }, 404);
    }

    if (result.type === 'invalid-match-result') {
      return c.json({ message: `Match ${result.matchId} has an unsupported result value` }, 409);
    }

    if (result.type === 'missing-standings') {
      return c.json(
        {
          message: 'Every player in the selected round must have an imported tournament standing.',
          missingDeckIds: result.missingDeckIds,
        },
        409,
      );
    }

    const warnings = await refreshTournamentResultsDerivedData(tournamentId, result.metaId);

    return c.json({
      data: {
        matchesApplied: result.matchesApplied,
        standingsUpdated: result.standingsUpdated,
      },
      warnings,
    });
  },
);
