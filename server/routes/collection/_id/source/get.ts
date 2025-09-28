import { Hono } from 'hono';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../../../db';
import { collection as collectionTable } from '../../../../db/schema/collection.ts';
import { collectionSourceCollection as cscTable } from '../../../../db/schema/collection_source_collection.ts';
import { and, eq, getTableColumns, or } from 'drizzle-orm';
import { user as userTable } from '../../../../db/schema/auth-schema.ts';
import { selectUser } from '../../../user.ts';

const selectCollection = getTableColumns(collectionTable);
const selectCsc = getTableColumns(cscTable);

/**
 * Get collections related to a collection by id via collection_source_collection mapping
 * Query:
 * - target: 'source' | 'target' (default 'target')
 * - displayOnSource: boolean (optional)
 * Response: array of { user, collection, collectionSource }
 */
const getSourcesQuerySchema = z.object({
  target: z.enum(['source', 'target']).optional().default('target'),
  // Accept 'true' | 'false' as strings from query and transform to boolean
  displayOnSource: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform(v => (v === undefined ? undefined : v === 'true')),
});

export const collectionIdSourceGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('query', getSourcesQuerySchema),
  async c => {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ message: 'Invalid collection id' }, 500);
    }

    const { target, displayOnSource } = c.req.valid('query');
    const user = c.get('user');

    const filters = [] as any[];

    if (target === 'source') {
      filters.push(eq(cscTable.sourceCollectionId, id));
    } else {
      filters.push(eq(cscTable.collectionId, id));
    }

    if (displayOnSource === true) {
      filters.push(eq(cscTable.displayOnSource, true));
    }

    if (user) {
      filters.push(or(eq(collectionTable.public, true), eq(collectionTable.userId, user.id)));
    } else {
      filters.push(eq(collectionTable.public, true));
    }

    // Join mapping -> collection -> user and include mapping row (csc)
    const rows = await db
      .select({
        user: selectUser,
        collection: selectCollection,
        collectionSource: selectCsc,
      })
      .from(cscTable)
      .innerJoin(
        collectionTable,
        target === 'source'
          ? eq(collectionTable.id, cscTable.collectionId)
          : eq(collectionTable.id, cscTable.sourceCollectionId),
      )
      .innerJoin(userTable, eq(collectionTable.userId, userTable.id))
      .where(and(...filters));

    return c.json(rows);
  },
);
