import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../../db';
import { entityResource } from '../../../db/schema/entity_resource.ts';

export const entitiesIdGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const entityId = z.guid().parse(c.req.param('id'));

  // Query all resources for this entity
  const resources = await db
    .select()
    .from(entityResource)
    .where(eq(entityResource.entityId, entityId))
    .orderBy(entityResource.createdAt);

  return c.json({ data: resources });
});
