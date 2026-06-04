import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../../../../../../auth/auth.ts';
import { db } from '../../../../../../db';
import { deck as deckTable } from '../../../../../../db/schema/deck.ts';
import { teamDeck } from '../../../../../../db/schema/team_deck.ts';
import { deckBranch } from '../../../../../../db/schema/deck_branch.ts';
import { getTeamMembership } from '../../../../../../lib/getTeamMembership.ts';
import { copyDeckCards, getDeckSnapshot } from '../../../../../../lib/decks/deckBranchSnapshot.ts';
import { zDeckBranchCreateRequest } from '../../../../../../../types/ZDeckBranch.ts';
import { updateDeckInformation } from '../../../../../../lib/decks/updateDeckInformation.ts';
import { generateDeckThumbnail } from '../../../../../../lib/decks/generateDeckThumbnail.ts';
import { runInBackground } from '../../../../../../lib/utils/backgroundProcess.ts';

export const teamsIdDecksDeckIdBranchesPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zDeckBranchCreateRequest),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const teamId = z.guid().parse(c.req.param('id'));
    const deckId = z.guid().parse(c.req.param('deckId'));
    const data = c.req.valid('json');

    const membership = await getTeamMembership(teamId, user.id);
    if (!membership) {
      return c.json({ message: 'You must be a team member to branch team decks' }, 403);
    }

    const [teamDeckRow] = await db
      .select()
      .from(teamDeck)
      .where(and(eq(teamDeck.teamId, teamId), eq(teamDeck.deckId, deckId)))
      .limit(1);
    if (!teamDeckRow) return c.json({ message: 'Deck is not in this team' }, 404);

    const [sourceDeck] = await db.select().from(deckTable).where(eq(deckTable.id, deckId)).limit(1);
    if (!sourceDeck) return c.json({ message: 'Deck not found' }, 404);
    if (sourceDeck.cardPoolId) {
      return c.json({ message: 'Limited/card-pool decks cannot be branched yet' }, 400);
    }

    const baseSnapshot = await getDeckSnapshot(deckId);
    if (!baseSnapshot) return c.json({ message: 'Deck not found' }, 404);

    const result = await db.transaction(async tx => {
      const [branchDeck] = await tx
        .insert(deckTable)
        .values({
          userId: user.id,
          format: sourceDeck.format,
          name: data.name ?? `Branch of ${sourceDeck.name}`,
          description: sourceDeck.description,
          leaderCardId1: sourceDeck.leaderCardId1,
          leaderCardId2: sourceDeck.leaderCardId2,
          baseCardId: sourceDeck.baseCardId,
          public: 0,
          cardPoolId: null,
        })
        .returning();

      await copyDeckCards(sourceDeck.id, branchDeck.id, tx);

      const [branch] = await tx
        .insert(deckBranch)
        .values({
          teamId,
          baseDeckId: sourceDeck.id,
          branchDeckId: branchDeck.id,
          creatorUserId: user.id,
          baseSnapshot,
        })
        .returning();

      return { branch, branchDeck };
    });

    await updateDeckInformation(result.branchDeck.id);
    if (result.branchDeck.leaderCardId1 && result.branchDeck.baseCardId) {
      runInBackground(
        generateDeckThumbnail,
        result.branchDeck.leaderCardId1,
        result.branchDeck.baseCardId,
      );
    }

    return c.json({ data: result }, 201);
  },
);
