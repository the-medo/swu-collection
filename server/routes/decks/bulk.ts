import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { auth, type AuthExtension } from '../../auth/auth.ts';
import { getBulkDecks } from '../../lib/decks/getBulkDecks.ts';
export type { DecksBulkResponse } from '../../lib/decks/getBulkDecks.ts';

const zBulkDecksQueryParams = z.object({
  ids: z
    .string()
    .transform(value => value.split(','))
    .pipe(z.array(z.guid()))
    .refine(ids => ids.length > 0, { message: 'At least one deck ID must be provided' }),
});

export const decksBulkGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('query', zBulkDecksQueryParams),
  async c => {
    const { ids } = c.req.valid('query');
    const user = c.get('user');
    c.header('Cache-Control', 'private, no-store');
    const isAdmin = user
      ? (
          await auth.api.userHasPermission({
            body: { userId: user.id, permissions: { admin: ['access'] } },
          })
        ).success
      : false;
    return c.json(await getBulkDecks(ids, user?.id ?? null, isAdmin));
  },
);
