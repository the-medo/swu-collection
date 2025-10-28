import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../db';
import { entityResource } from '../../db/schema/entity_resource.ts';
import { sql } from 'drizzle-orm';

// Define the schema for entity resource creation
const entityResourceSchema = z.object({
  entityType: z.string().min(1).max(50),
  entityId: z.guid(),
  resourceType: z.string().min(1).max(50),
  resourceUrl: z.string().min(1),
  title: z.string().max(255).optional(),
  description: z.string().optional(),
});

export const entitiesPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', entityResourceSchema),
  async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const data = c.req.valid('json');

    // Insert the new entity resource
    const newEntityResource = await db
      .insert(entityResource)
      .values({
        ...data,
        createdAt: sql`NOW()`,
        updatedAt: sql`NOW()`,
      })
      .returning();

    return c.json({ data: newEntityResource[0] }, 201);
  },
);
