import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { auth } from '../../../../auth/auth.ts';
import { zDeckVersionSaveRequest } from '../../../../../types/ZDeckVersion.ts';
import { DeckVersionError } from '../../../../lib/decks/deckVersionErrors.ts';
import { saveDeckVersion } from '../../../../lib/decks/saveDeckVersion.ts';

export const deckIdVersionsPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zDeckVersionSaveRequest),
  async c => {
    const deckId = z.guid().parse(c.req.param('id'));
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);
    const isAdmin = (
      await auth.api.userHasPermission({
        body: { userId: user.id, permission: { admin: ['access'] } },
      })
    ).success;

    try {
      const result = await saveDeckVersion({
        deckId,
        actorId: user.id,
        isAdmin,
        ...c.req.valid('json'),
      });
      return c.json({ data: result }, 201);
    } catch (error) {
      if (error instanceof DeckVersionError) {
        if (error.code === 'STALE_DECK') return c.json({ message: error.message }, 409);
        if (error.code === 'NO_VERSION_CHANGES') return c.json({ message: error.message }, 400);
        if (error.code === 'LIMITED_DECK_UNSUPPORTED')
          return c.json({ message: error.message }, 400);
        return c.json({ message: error.message }, 404);
      }
      throw error;
    }
  },
);
