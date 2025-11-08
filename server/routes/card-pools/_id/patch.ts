import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../../auth/auth.ts';

const zParams = z.object({ id: z.uuid() });
const zBody = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  visibility: z.enum(['private', 'unlisted', 'public']).optional(),
});

export const cardPoolsIdPatchRoute = new Hono<AuthExtension>().patch(
  '/',
  zValidator('param', zParams),
  zValidator('json', zBody),
  async c => {
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');
    // TODO: update fields (name, description, visibility)
    return c.json(
      {
        data: { id, updated: body },
        note: 'Not implemented yet. Updates allowed fields for the card pool.',
      },
      501,
    );
  },
);
