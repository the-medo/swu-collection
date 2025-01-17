import { Hono } from 'hono';
import type { AuthExtension } from '../auth/auth.ts';
import { cardList } from '../db/lists.ts';

export const cardsRoute = new Hono<AuthExtension>().get('/', c => {
  return c.json({ cards: cardList });
});
