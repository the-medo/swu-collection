import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { getCardPoolEmbed } from '../../../../lib/card-pools/embed.ts';

export const cardPoolsIdEmbedGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('param', z.object({ id: z.uuid() })),
  async c => {
    c.header('Cache-Control', 'private, no-store');
    const data = await getCardPoolEmbed(c.req.valid('param').id);
    if (!data) return c.json({ message: 'This sealed pool is private or unavailable.' }, 404);
    return c.json({ data });
  },
);
