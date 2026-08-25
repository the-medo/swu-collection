import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { AuthExtension } from '../../../../../../../auth/auth.ts';
import { requireAdmin } from '../../../../../../../auth/requireAdmin.ts';
import { db } from '../../../../../../../db';
import { deck } from '../../../../../../../db/schema/deck.ts';
import { tournament } from '../../../../../../../db/schema/tournament.ts';
import { tournamentDeck } from '../../../../../../../db/schema/tournament_deck.ts';
import { replaceDeckPlacementInName } from '../../../../../../../lib/tournaments/replaceDeckPlacementInName.ts';
import {
  refreshTournamentResultsDerivedData,
  zTournamentStandingMoveBody,
  zTournamentStandingParams,
} from '../../../lib.ts';

export const adminTournamentIdStandingMovePostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('param', zTournamentStandingParams),
  zValidator('json', zTournamentStandingMoveBody),
  async c => {
    const admin = await requireAdmin(c);
    if (admin.response) return admin.response;

    const { tournamentId, deckId } = c.req.valid('param');
    const { direction } = c.req.valid('json');

    const result = await db.transaction(async tx => {
      const selectedTournament = (
        await tx
          .select({ id: tournament.id, meta: tournament.meta })
          .from(tournament)
          .where(eq(tournament.id, tournamentId))
          .limit(1)
      )[0];

      if (!selectedTournament) return { type: 'tournament-not-found' as const };

      const selectedStanding = (
        await tx
          .select({ placement: tournamentDeck.placement })
          .from(tournamentDeck)
          .where(
            and(eq(tournamentDeck.tournamentId, tournamentId), eq(tournamentDeck.deckId, deckId)),
          )
          .limit(1)
      )[0];

      if (!selectedStanding) return { type: 'standing-not-found' as const };
      if (selectedStanding.placement === null) return { type: 'no-placement' as const };
      if (direction === 'up' && selectedStanding.placement <= 1) {
        return { type: 'no-adjacent-placement' as const };
      }

      const currentPlacement = selectedStanding.placement;
      const targetPlacement = direction === 'up' ? currentPlacement - 1 : currentPlacement + 1;
      const rowsAtCurrentPlacement = await tx
        .select({ deckId: tournamentDeck.deckId })
        .from(tournamentDeck)
        .where(
          and(
            eq(tournamentDeck.tournamentId, tournamentId),
            eq(tournamentDeck.placement, currentPlacement),
          ),
        );

      if (rowsAtCurrentPlacement.length !== 1) {
        return { type: 'ambiguous-current-placement' as const };
      }

      const rowsAtTargetPlacement = await tx
        .select({ deckId: tournamentDeck.deckId })
        .from(tournamentDeck)
        .where(
          and(
            eq(tournamentDeck.tournamentId, tournamentId),
            eq(tournamentDeck.placement, targetPlacement),
          ),
        );

      if (rowsAtTargetPlacement.length === 0) {
        return { type: 'no-adjacent-placement' as const };
      }

      if (rowsAtTargetPlacement.length !== 1) {
        return { type: 'ambiguous-adjacent-placement' as const };
      }

      const adjacentDeckId = rowsAtTargetPlacement[0].deckId;
      const decks = await tx
        .select({ id: deck.id, name: deck.name })
        .from(deck)
        .where(inArray(deck.id, [deckId, adjacentDeckId]));
      const deckNames = new Map(decks.map(currentDeck => [currentDeck.id, currentDeck.name]));
      const selectedDeckName = deckNames.get(deckId);
      const adjacentDeckName = deckNames.get(adjacentDeckId);

      if (selectedDeckName === undefined || adjacentDeckName === undefined) {
        return { type: 'deck-not-found' as const };
      }

      await tx
        .update(tournamentDeck)
        .set({ placement: targetPlacement })
        .where(
          and(eq(tournamentDeck.tournamentId, tournamentId), eq(tournamentDeck.deckId, deckId)),
        );
      await tx
        .update(tournamentDeck)
        .set({ placement: currentPlacement })
        .where(
          and(
            eq(tournamentDeck.tournamentId, tournamentId),
            eq(tournamentDeck.deckId, adjacentDeckId),
          ),
        );
      await tx
        .update(deck)
        .set({
          name: replaceDeckPlacementInName(selectedDeckName, targetPlacement),
          updatedAt: sql`NOW()`,
        })
        .where(eq(deck.id, deckId));
      await tx
        .update(deck)
        .set({
          name: replaceDeckPlacementInName(adjacentDeckName, currentPlacement),
          updatedAt: sql`NOW()`,
        })
        .where(eq(deck.id, adjacentDeckId));
      await tx
        .update(tournament)
        .set({ updatedAt: sql`NOW()` })
        .where(eq(tournament.id, tournamentId));

      return { type: 'success' as const, metaId: selectedTournament.meta };
    });

    if (result.type === 'tournament-not-found') {
      return c.json({ message: 'Tournament not found' }, 404);
    }

    if (result.type === 'standing-not-found') {
      return c.json({ message: 'Tournament standing not found' }, 404);
    }

    if (result.type === 'deck-not-found') {
      return c.json({ message: 'A linked decklist could not be found' }, 404);
    }

    if (result.type === 'no-placement') {
      return c.json({ message: 'A standing without a placement cannot be moved' }, 409);
    }

    if (result.type === 'ambiguous-current-placement') {
      return c.json({ message: 'A duplicate placement cannot be moved with arrows' }, 409);
    }

    if (result.type === 'ambiguous-adjacent-placement') {
      return c.json({ message: 'The adjacent placement is duplicated and cannot be swapped' }, 409);
    }

    if (result.type === 'no-adjacent-placement') {
      return c.json({ message: 'There is no unique adjacent placement to swap with' }, 409);
    }

    const warnings = await refreshTournamentResultsDerivedData(tournamentId, result.metaId);

    return c.json({ data: { direction }, warnings });
  },
);
