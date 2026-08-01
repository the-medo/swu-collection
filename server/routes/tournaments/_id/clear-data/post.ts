import { Hono } from 'hono';
import { and, eq, inArray, ne, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { requireAdmin } from '../../../../auth/requireAdmin.ts';
import { db } from '../../../../db';
import { tournament } from '../../../../db/schema/tournament.ts';
import { tournamentDeck } from '../../../../db/schema/tournament_deck.ts';
import { tournamentMatch } from '../../../../db/schema/tournament_match.ts';
import { deck } from '../../../../db/schema/deck.ts';
import { deckCard } from '../../../../db/schema/deck_card.ts';
import { deckInformation } from '../../../../db/schema/deck_information.ts';
import { entityResource } from '../../../../db/schema/entity_resource.ts';
import {
  cardStatTournament,
  cardStatTournamentLeader,
  cardStatTournamentLeaderBase,
} from '../../../../db/schema/card_stats_schema.ts';
import {
  cardStatMatchupDecks,
  cardStatMatchupTournaments,
} from '../../../../db/schema/card_stat_matchup_schema.ts';
import { cardPoolDeckCards, cardPoolDecks } from '../../../../db/schema/card_pool_deck.ts';
import {
  tournamentImport,
  tournamentStanding,
  tournamentWeekendMatch,
  tournamentWeekendPlayer,
  tournamentWeekendTournament,
} from '../../../../db/schema/tournament_weekend.ts';
import { computeAndSaveMetaStatistics } from '../../../../lib/card-statistics';
import { updateTournamentGroupsStatisticsForTournament } from '../../../../lib/card-statistics/update-tournament-group-statistics.ts';

export const tournamentIdClearDataPostRoute = new Hono<AuthExtension>().post('/', async c => {
  const admin = await requireAdmin(c);
  if (admin.response) return admin.response;

  const tournamentIdResult = z.guid().safeParse(c.req.param('id'));
  if (!tournamentIdResult.success) {
    return c.json({ message: 'A valid tournament id is required.' }, 400);
  }
  const tournamentId = tournamentIdResult.data;

  const [existingTournament] = await db
    .select()
    .from(tournament)
    .where(eq(tournament.id, tournamentId));

  if (!existingTournament) {
    return c.json({ message: 'Tournament not found.' }, 404);
  }

  const [activeImport] = await db
    .select({ status: tournamentImport.status })
    .from(tournamentImport)
    .where(eq(tournamentImport.tournamentId, tournamentId));

  if (activeImport?.status === 'pending' || activeImport?.status === 'running') {
    return c.json(
      { message: 'Cannot clear data while a live tournament import is queued or running.' },
      409,
    );
  }

  const result = await db.transaction(async tx => {
    const linkedDecks = await tx
      .select({ deckId: tournamentDeck.deckId })
      .from(tournamentDeck)
      .where(eq(tournamentDeck.tournamentId, tournamentId));
    const linkedDeckIds = linkedDecks.map(({ deckId }) => deckId);

    const deckIdsUsedByOtherTournaments = new Set<string>();
    if (linkedDeckIds.length) {
      const sharedDecks = await tx
        .select({ deckId: tournamentDeck.deckId })
        .from(tournamentDeck)
        .where(
          and(
            inArray(tournamentDeck.deckId, linkedDeckIds),
            ne(tournamentDeck.tournamentId, tournamentId),
          ),
        );
      sharedDecks.forEach(({ deckId }) => deckIdsUsedByOtherTournaments.add(deckId));

      const matchesUsingLinkedDecks = await tx
        .select({ p1DeckId: tournamentMatch.p1DeckId, p2DeckId: tournamentMatch.p2DeckId })
        .from(tournamentMatch)
        .where(
          and(
            ne(tournamentMatch.tournamentId, tournamentId),
            or(
              inArray(tournamentMatch.p1DeckId, linkedDeckIds),
              inArray(tournamentMatch.p2DeckId, linkedDeckIds),
            ),
          ),
        );
      matchesUsingLinkedDecks.forEach(({ p1DeckId, p2DeckId }) => {
        deckIdsUsedByOtherTournaments.add(p1DeckId);
        if (p2DeckId) deckIdsUsedByOtherTournaments.add(p2DeckId);
      });
    }

    // Only imported decks that are no longer used by another tournament can be removed.
    // This protects shared decks created by an import-from-blob operation.
    const removableDeckIds = linkedDeckIds.filter(
      deckId => !deckIdsUsedByOtherTournaments.has(deckId),
    );
    const importedDeckIds = removableDeckIds.length
      ? (
          await tx
            .select({ id: deck.id })
            .from(deck)
            .where(and(inArray(deck.id, removableDeckIds), eq(deck.userId, 'swubase')))
        ).map(({ id }) => id)
      : [];

    await tx.delete(tournamentMatch).where(eq(tournamentMatch.tournamentId, tournamentId));
    await tx.delete(tournamentDeck).where(eq(tournamentDeck.tournamentId, tournamentId));
    await tx.delete(tournamentStanding).where(eq(tournamentStanding.tournamentId, tournamentId));
    await tx
      .delete(tournamentWeekendMatch)
      .where(eq(tournamentWeekendMatch.tournamentId, tournamentId));
    await tx
      .delete(tournamentWeekendPlayer)
      .where(eq(tournamentWeekendPlayer.tournamentId, tournamentId));
    await tx.delete(cardStatTournament).where(eq(cardStatTournament.tournamentId, tournamentId));
    await tx
      .delete(cardStatTournamentLeader)
      .where(eq(cardStatTournamentLeader.tournamentId, tournamentId));
    await tx
      .delete(cardStatTournamentLeaderBase)
      .where(eq(cardStatTournamentLeaderBase.tournamentId, tournamentId));
    await tx
      .delete(cardStatMatchupTournaments)
      .where(eq(cardStatMatchupTournaments.tournamentId, tournamentId));
    await tx.delete(tournamentImport).where(eq(tournamentImport.tournamentId, tournamentId));
    await tx
      .update(tournamentWeekendTournament)
      .set({
        status: 'unknown',
        hasDecklists: false,
        additionalData: null,
        roundNumber: null,
        roundName: null,
        matchesTotal: null,
        matchesRemaining: null,
        exactStart: null,
        lastUpdatedAt: null,
        wasCheckedFinished: false,
        updatedAt: sql`NOW()`,
      })
      .where(eq(tournamentWeekendTournament.tournamentId, tournamentId));

    if (importedDeckIds.length) {
      await tx
        .delete(cardStatMatchupDecks)
        .where(inArray(cardStatMatchupDecks.deckId, importedDeckIds));
      await tx.delete(deckCard).where(inArray(deckCard.deckId, importedDeckIds));
      await tx.delete(deckInformation).where(inArray(deckInformation.deckId, importedDeckIds));
      await tx.delete(entityResource).where(inArray(entityResource.entityId, importedDeckIds));
      await tx.delete(cardPoolDeckCards).where(inArray(cardPoolDeckCards.deckId, importedDeckIds));
      await tx.delete(cardPoolDecks).where(inArray(cardPoolDecks.deckId, importedDeckIds));
      await tx.delete(deck).where(inArray(deck.id, importedDeckIds));
    }

    const [clearedTournament] = await tx
      .update(tournament)
      .set({ imported: false, updatedAt: sql`NOW()` })
      .where(eq(tournament.id, tournamentId))
      .returning();

    return {
      tournament: clearedTournament,
      clearedDecks: importedDeckIds.length,
      detachedDecks: linkedDeckIds.length - importedDeckIds.length,
    };
  });

  try {
    if (existingTournament.meta !== null) {
      await computeAndSaveMetaStatistics(existingTournament.meta);
    }
    await updateTournamentGroupsStatisticsForTournament(tournamentId);
  } catch (error) {
    console.error(`Error updating statistics after clearing tournament ${tournamentId}:`, error);
  }

  return c.json({
    message: 'Tournament data cleared successfully.',
    data: result,
  });
});
