import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../auth/auth.ts';
import { getArticleTemplateMeta } from '../lib/creators/articleTemplateData.ts';

const query = z.discriminatedUnion('scope', [
  z.object({ scope: z.literal('current'), format: z.coerce.number().int().positive() }),
  z.object({ scope: z.enum(['tournament', 'group']), id: z.uuid() }),
]);
export function createCreatorTemplatesRoute(load = getArticleTemplateMeta) {
  return new Hono<AuthExtension>().get('/meta', zValidator('query', query), async c =>
    c.json({ data: await load(c.req.valid('query')) }),
  );
}
