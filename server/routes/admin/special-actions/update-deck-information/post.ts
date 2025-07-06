import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../../../auth/auth.ts';
import { db } from '../../../../db';
import { deck as deckTable } from '../../../../db/schema/deck.ts';
import { updateDeckInformation } from '../../../../lib/decks/updateDeckInformation.ts';

export const updateDeckInformationPostRoute = new Hono<AuthExtension>().post('/', async c => {
  const user = c.get('user');
  if (!user) return c.json({ message: 'Unauthorized' }, 401);

  // Check if user has admin permission
  const hasPermission = await auth.api.userHasPermission({
    body: {
      userId: user.id,
      permission: {
        admin: ['access'],
      },
    },
  });

  if (!hasPermission.success) {
    return c.json(
      {
        message: "You don't have permission to update deck information.",
      },
      403,
    );
  }

  try {
    // Get all decks
    const decks = await db.select({ id: deckTable.id }).from(deckTable);

    // Update deck information for each deck
    let updatedCount = 0;
    for (const deck of decks) {
      await updateDeckInformation(deck.id);
      updatedCount++;
    }

    return c.json(
      {
        message: `Successfully updated information for ${updatedCount} decks`,
        data: {
          updatedCount,
        },
      },
      200,
    );
  } catch (error) {
    console.error('Error updating deck information:', error);
    return c.json(
      {
        message: 'Failed to update deck information',
        error: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});
