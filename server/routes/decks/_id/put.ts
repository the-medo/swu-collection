import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { zDeckUpdateRequest } from '../../../../types/ZDeck.ts';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { deck as deckTable } from '../../../db/schema/deck.ts';
import { db } from '../../../db';
import { updateDeckInformation } from '../../../lib/decks/updateDeckInformation.ts';
import { generateDeckThumbnail } from '../../../lib/decks/generateDeckThumbnail.ts';
import { runInBackground } from '../../../lib/utils/backgroundProcess.ts';
import { cardPoolDecks } from '../../../db/schema/card_pool_deck.ts';
import { publicToVisibilityMap } from '../../../../shared/types/visibility.ts';
import {
  assertDeckEditable,
  getDeckBranchContext,
  isAdminUser,
} from '../../../lib/decks/deckBranchAccess.ts';

export const deckIdPutRoute = new Hono<AuthExtension>().put(
  '/',
  zValidator('json', zDeckUpdateRequest),
  async c => {
    const paramDeckId = z.guid().parse(c.req.param('id'));
    const data = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const isAdmin = await isAdminUser(user.id);
    const editable = await assertDeckEditable(paramDeckId, user.id, isAdmin);
    if (!editable.ok) return c.json({ message: editable.message }, editable.status);

    // Get the current deck data to check if leader or base card has changed
    const currentDeck = editable.deck;
    const branchContext = await getDeckBranchContext(paramDeckId);
    const updateData = branchContext ? { ...data, public: 2 } : data;

    // Check if leader or base card is being updated
    const isLeaderUpdated =
      updateData.leaderCardId1 !== undefined &&
      updateData.leaderCardId1 !== currentDeck.leaderCardId1;
    const isBaseUpdated =
      updateData.baseCardId !== undefined && updateData.baseCardId !== currentDeck.baseCardId;

    const updatedDeck = (
      await db
        .update(deckTable)
        .set({
          ...updateData,
          updatedAt: sql`NOW()`,
        })
        .where(eq(deckTable.id, paramDeckId))
        .returning()
    )[0];

    const newVisibility =
      typeof updateData.public !== 'undefined' ? publicToVisibilityMap[updateData.public] : undefined;
    if (newVisibility) {
      await db
        .update(cardPoolDecks)
        .set({ visibility: newVisibility })
        .where(eq(cardPoolDecks.deckId, paramDeckId));
    }

    await updateDeckInformation(paramDeckId);

    // Generate deck thumbnail in the background if leader or base card has changed
    if ((isLeaderUpdated || isBaseUpdated) && updatedDeck.leaderCardId1 && updatedDeck.baseCardId) {
      runInBackground(generateDeckThumbnail, updatedDeck.leaderCardId1, updatedDeck.baseCardId);
      console.log('Deck thumbnail generation started in background');
    }

    return c.json({ data: updatedDeck });
  },
);
