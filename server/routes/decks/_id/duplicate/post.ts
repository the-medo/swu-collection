import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { z } from 'zod';

export const deckIdDuplicatePostRoute = new Hono<AuthExtension>().post('/', async c => {
  const paramDeckId = z.string().uuid().parse(c.req.param('id'));
});
