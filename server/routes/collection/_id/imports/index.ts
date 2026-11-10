import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { db } from '../../../../db/index.ts';
import { collection } from '../../../../db/schema/collection.ts';
import { collectionImport, collectionImportRow } from '../../../../db/schema/collection_import.ts';
import {
  CollectionImportError,
  importSummary,
  resolvedImportCopiesSql,
  pendingImportRowsSql,
} from '../../../../lib/collections/importCollectionCsv.ts';
import { reviewCollectionImport } from '../../../../lib/collections/reviewCollectionImport.ts';
import {
  collectionImportResolvedCopies,
  zResolveCollectionImportDuplicate,
} from '../../../../../types/CollectionImport.ts';
import type { CollectionImportReview } from '../../../../../types/CollectionImport.ts';

const collectionParam = z.object({ id: z.guid() });
const importParam = collectionParam.extend({ importId: z.guid() });

export const collectionImportsRoute = new Hono<AuthExtension>()
  .get(
    '/',
    zValidator('param', collectionParam),
    zValidator('query', z.object({ page: z.coerce.number().int().min(0).max(1000000).default(0) })),
    async c => {
      const user = c.get('user');
      if (!user) return c.json({ message: 'Unauthorized' }, 401);
      const { id } = c.req.valid('param');
      const [owned] = await db
        .select({ id: collection.id })
        .from(collection)
        .where(and(eq(collection.id, id), eq(collection.userId, user.id)));
      if (!owned) return c.json({ message: 'Collection not found.' }, 404);
      const reports = await db
        .select({
          report: collectionImport,
          resolvedCopies: resolvedImportCopiesSql,
          pendingRows: pendingImportRowsSql,
        })
        .from(collectionImport)
        .where(eq(collectionImport.collectionId, id))
        // Keep unfinished imports reachable even after many newer successful imports.
        .orderBy(
          desc(sql`${pendingImportRowsSql} > 0`),
          desc(collectionImport.createdAt),
          desc(collectionImport.id),
        )
        .limit(101)
        .offset(c.req.valid('query').page * 100);
      return c.json({
        data: reports
          .slice(0, 100)
          .map(({ report, resolvedCopies, pendingRows }) =>
            importSummary(report, resolvedCopies, pendingRows),
          ),
        hasMore: reports.length > 100,
      });
    },
  )
  .get('/:importId', zValidator('param', importParam), async c => {
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);
    const { id, importId } = c.req.valid('param');
    const [found] = await db
      .select({ report: collectionImport, title: collection.title })
      .from(collectionImport)
      .innerJoin(collection, eq(collection.id, collectionImport.collectionId))
      .where(
        and(
          eq(collection.id, id),
          eq(collection.userId, user.id),
          eq(collectionImport.id, importId),
        ),
      );
    if (!found) return c.json({ message: 'Import not found.' }, 404);
    const rows = await db
      .select()
      .from(collectionImportRow)
      .where(eq(collectionImportRow.importId, importId))
      .orderBy(asc(collectionImportRow.rowNumber));
    const data: CollectionImportReview = {
      import: {
        ...importSummary(
          found.report,
          collectionImportResolvedCopies(rows),
          rows.filter(row => !row.completedAt).length,
        ),
        headers: found.report.headers,
      },
      collectionTitle: found.title,
      rows: rows.map(({ importId: _importId, ...row }) => ({
        ...row,
        completedAt: row.completedAt?.toISOString() ?? null,
      })),
    };
    return c.json({ data });
  })
  .patch(
    '/:importId/rows/:rowId',
    zValidator('param', importParam.extend({ rowId: z.guid() })),
    zValidator('json', z.object({ completed: z.boolean() }).strict()),
    async c => {
      const user = c.get('user');
      if (!user) return c.json({ message: 'Unauthorized' }, 401);
      const { id, importId, rowId } = c.req.valid('param');
      try {
        const data = await reviewCollectionImport(
          user.id,
          id,
          importId,
          rowId,
          c.req.valid('json'),
        );
        return c.json({ data });
      } catch (error) {
        if (error instanceof CollectionImportError)
          return c.json({ message: error.message }, error.status);
        throw error;
      }
    },
  )
  .post(
    '/:importId/rows/:rowId/resolve-duplicate',
    zValidator('param', importParam.extend({ rowId: z.guid() })),
    zValidator('json', zResolveCollectionImportDuplicate),
    async c => {
      const user = c.get('user');
      if (!user) return c.json({ message: 'Unauthorized' }, 401);
      const { id, importId, rowId } = c.req.valid('param');
      try {
        const data = await reviewCollectionImport(
          user.id,
          id,
          importId,
          rowId,
          c.req.valid('json'),
        );
        return c.json({ data });
      } catch (error) {
        if (error instanceof CollectionImportError)
          return c.json({ message: error.message }, error.status);
        throw error;
      }
    },
  );
