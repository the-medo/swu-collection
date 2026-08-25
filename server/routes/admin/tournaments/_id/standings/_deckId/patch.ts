import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, eq, sql } from 'drizzle-orm';
import type { AuthExtension } from '../../../../../../auth/auth.ts';
import { requireAdmin } from '../../../../../../auth/requireAdmin.ts';
import { db } from '../../../../../../db';
import { deck } from '../../../../../../db/schema/deck.ts';
import { tournament } from '../../../../../../db/schema/tournament.ts';
import { tournamentDeck } from '../../../../../../db/schema/tournament_deck.ts';
import { replaceDeckPlacementInName } from '../../../../../../lib/tournaments/replaceDeckPlacementInName.ts';
import {
  refreshTournamentResultsDerivedData,
  zTournamentStandingParams,
  zTournamentStandingUpdateBody,
} from '../../lib.ts';

export const adminTournamentIdStandingPatchRoute = new Hono<AuthExtension>().patch(
  '/',
  zValidator('param', zTournamentStandingParams),
  zValidator('json', zTournamentStandingUpdateBody),
  async c => {
    const admin = await requireAdmin(c);
    if (admin.response) return admin.response;

    const { tournamentId, deckId } = c.req.valid('param');
    const updates = c.req.valid('json');

    const result = await db.transaction(async tx => {
      const selectedTournament = (
        await tx
          .select({
            id: tournament.id,
            meta: tournament.meta,
          })
          .from(tournament)
          .where(eq(tournament.id, tournamentId))
          .limit(1)
      )[0];

      if (!selectedTournament) return { type: 'tournament-not-found' as const };

      const currentStanding = (
        await tx
          .select({ placement: tournamentDeck.placement })
          .from(tournamentDeck)
          .where(
            and(eq(tournamentDeck.tournamentId, tournamentId), eq(tournamentDeck.deckId, deckId)),
          )
          .limit(1)
      )[0];

      if (!currentStanding) return { type: 'standing-not-found' as const };

      const shouldRenameDeck =
        updates.placement !== null && updates.placement !== currentStanding.placement;
      const currentDeck = shouldRenameDeck
        ? (await tx.select({ name: deck.name }).from(deck).where(eq(deck.id, deckId)).limit(1))[0]
        : undefined;

      if (shouldRenameDeck && !currentDeck) return { type: 'deck-not-found' as const };

      const [standing] = await tx
        .update(tournamentDeck)
        .set(updates)
        .where(
          and(eq(tournamentDeck.tournamentId, tournamentId), eq(tournamentDeck.deckId, deckId)),
        )
        .returning();

      if (!standing) return { type: 'standing-not-found' as const };

      if (currentDeck && standing.placement !== null) {
        await tx
          .update(deck)
          .set({
            name: replaceDeckPlacementInName(currentDeck.name, standing.placement),
            updatedAt: sql`NOW()`,
          })
          .where(eq(deck.id, deckId));
      }

      await tx
        .update(tournament)
        .set({ updatedAt: sql`NOW()` })
        .where(eq(tournament.id, tournamentId));

      return { type: 'success' as const, standing, metaId: selectedTournament.meta };
    });

    if (result.type === 'tournament-not-found') {
      return c.json({ message: 'Tournament not found' }, 404);
    }

    if (result.type === 'standing-not-found') {
      return c.json({ message: 'Tournament standing not found' }, 404);
    }

    if (result.type === 'deck-not-found') {
      return c.json({ message: 'Linked decklist not found' }, 404);
    }

    const warnings = await refreshTournamentResultsDerivedData(tournamentId, result.metaId);

    return c.json({ data: result.standing, warnings });
  },
);
