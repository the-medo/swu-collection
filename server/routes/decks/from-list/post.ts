import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { zValidator } from '@hono/zod-validator';
import type { AuthExtension } from '../../../auth/auth.ts';
import {
  DECKLIST_CREATION_COOLDOWN_MS,
  zDeckFromListRequest,
} from '../../../../types/DeckFromList.ts';
import { createDeckFromList, InvalidDecklistError } from '../../../lib/decks/createDeckFromList.ts';

export function createDeckFromListRoute(create = createDeckFromList, now = Date.now) {
  const creations = new Map<string, { pending: boolean; until: number }>();
  return new Hono<AuthExtension>().post(
    '/',
    async (c, next) => {
      if (!c.get('user')) return c.json({ message: 'Unauthorized' }, 401);
      await next();
    },
    bodyLimit({
      maxSize: 64 * 1024,
      onError: c => c.json({ message: 'Decklist is too large.' }, 413),
    }),
    zValidator('json', zDeckFromListRequest, (result, c) => {
      if (!result.success)
        return c.json({ message: result.error.issues[0]?.message ?? 'Invalid decklist.' }, 400);
    }),
    async c => {
      const userId = c.get('user')!.id;
      const time = now();
      for (const [id, entry] of creations) {
        if (!entry.pending && entry.until <= time) creations.delete(id);
      }
      const previous = creations.get(userId);
      if (previous) {
        const seconds = previous.pending
          ? 30
          : Math.max(1, Math.ceil((previous.until - time) / 1000));
        c.header('Retry-After', String(seconds));
        return c.json(
          { message: `Please wait ${seconds} seconds before creating another deck.` },
          429,
        );
      }
      // Reserve before the first await so concurrent requests cannot both create a deck.
      creations.set(userId, { pending: true, until: time + DECKLIST_CREATION_COOLDOWN_MS });
      try {
        const created = await create(userId, c.req.valid('json'));
        creations.set(userId, { pending: false, until: now() + DECKLIST_CREATION_COOLDOWN_MS });
        return c.json({ data: created }, 201);
      } catch (error) {
        creations.delete(userId);
        if (error instanceof InvalidDecklistError) return c.json({ message: error.message }, 400);
        throw error;
      }
    },
  );
}

export const decksFromListPostRoute = createDeckFromListRoute();
