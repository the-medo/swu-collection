import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { and, eq, gte, sql } from 'drizzle-orm';
import { meta as metaTable } from '../../db/schema/meta.ts';
import { format as formatTable } from '../../db/schema/format.ts';
import { db } from '../../db';
import { withPagination } from '../../lib/withPagination.ts';
import { z } from 'zod';
import { selectMeta, selectFormat } from '../meta.ts';

// Define query parameters schema
const zMetaQueryParams = z.object({
  set: z.string().optional(),
  format: z.coerce.number().int().optional(),
  season: z.coerce.number().int().optional(),
  minSeason: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().default(20),
  offset: z.coerce.number().int().default(0),
  sort: z.string().default('meta.id'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const metaGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('query', zMetaQueryParams),
  async c => {
    const {
      set,
      format,
      season,
      minSeason,
      limit,
      offset,
      sort,
      order,
    } = c.req.valid('query');

    const filters = [];

    // Set filter
    if (set) {
      filters.push(eq(metaTable.set, set));
    }

    // Format filter
    if (format !== undefined) {
      filters.push(eq(metaTable.format, format));
    }

    // Season filter - either exact season or minimum season
    if (season !== undefined) {
      filters.push(eq(metaTable.season, season));
    } else if (minSeason !== undefined) {
      filters.push(gte(metaTable.season, minSeason));
    }

    // Build the query with all filters
    let query = db
      .select({
        meta: selectMeta,
        format: selectFormat,
      })
      .from(metaTable)
      .innerJoin(formatTable, eq(metaTable.format, formatTable.id))
      .$dynamic();

    // Apply all filters
    if (filters.length > 0) {
      query = query.where(and(...filters));
    }

    // Apply pagination
    query = withPagination(query, limit, offset);

    // Apply sorting
    const metas = await query.orderBy(sql.raw(`${sort} ${order}`));

    return c.json({
      data: metas,
      pagination: {
        limit,
        offset,
        hasMore: metas.length === limit,
      },
    });
  },
);