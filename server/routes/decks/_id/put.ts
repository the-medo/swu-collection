import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../../auth/auth.ts';
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
import { getDeckPermissions } from '../../../lib/decks/getDeckPermissions.ts';
import { loadDeck, lockDeck } from '../../../lib/decks/deckVersionRepository.ts';

export const deckIdPutRoute = new Hono<AuthExtension>().put(
  '/',
  zValidator('json', zDeckUpdateRequest),
  async c => {
    const paramDeckId = z.guid().parse(c.req.param('id'));
    const data = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const isAdmin = await auth.api.userHasPermission({
      body: {
        userId: user.id,
        permission: {
          admin: ['access'],
        },
      },
    });

    const result = await db.transaction(async tx => {
      await lockDeck(tx, paramDeckId);
      const currentDeck = await loadDeck(tx, paramDeckId);
      if (!currentDeck) return null;
      const permissions = await getDeckPermissions(
        currentDeck,
        user.id,
        isAdmin.success,
        'parent',
        tx,
      );
      if (!permissions.canEditMetadata) return false;
      if (data.public !== undefined && !permissions.canChangeVisibility) return false;

      const isLeaderUpdated =
        data.leaderCardId1 !== undefined && data.leaderCardId1 !== currentDeck.leaderCardId1;
      const isBaseUpdated =
        data.baseCardId !== undefined && data.baseCardId !== currentDeck.baseCardId;
      const [updatedDeck] = await tx
        .update(deckTable)
        .set({ ...data, updatedAt: sql`NOW()` })
        .where(eq(deckTable.id, paramDeckId))
        .returning();

      const newVisibility =
        typeof data.public !== 'undefined' ? publicToVisibilityMap[data.public] : undefined;
      if (newVisibility) {
        await tx
          .update(cardPoolDecks)
          .set({ visibility: newVisibility })
          .where(eq(cardPoolDecks.deckId, paramDeckId));
      }
      return { updatedDeck, isLeaderUpdated, isBaseUpdated };
    });

    if (result === null) {
      return c.json(
        {
          message: "Deck doesn't exist or you don't have permission to update it",
        },
        404,
      );
    }
    if (result === false) return c.json({ message: 'Unauthorized' }, 403);

    const { updatedDeck, isLeaderUpdated, isBaseUpdated } = result;

    await updateDeckInformation(paramDeckId);

    // Generate deck thumbnail in the background if leader or base card has changed
    if ((isLeaderUpdated || isBaseUpdated) && updatedDeck.leaderCardId1 && updatedDeck.baseCardId) {
      runInBackground(generateDeckThumbnail, updatedDeck.leaderCardId1, updatedDeck.baseCardId);
      console.log('Deck thumbnail generation started in background');
    }

    return c.json({ data: updatedDeck });
  },
);
