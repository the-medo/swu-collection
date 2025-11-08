import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../auth/auth.ts';

export const zCardPoolCreate = z.object({
  set: z.string().optional(),
  type: z.enum(['prerelease', 'sealed', 'draft']),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  leaders: z.array(z.string()).optional(),
  visibility: z.enum(['private', 'unlisted', 'public']).default('private'),
});
export type CardPoolCreate = z.infer<typeof zCardPoolCreate>;

export const cardPoolsPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zCardPoolCreate),
  async c => {
    const body = c.req.valid('json');
    // TODO: implement creation, seed cards as needed
    return c.json(
      {
        data: { id: '00000000-0000-0000-0000-000000000000', ...body },
        note: 'Not implemented yet. This should create a new card pool for sealed/draft/prerelease.',
      },
      501,
    );
  },
);
