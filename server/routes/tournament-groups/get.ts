import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { tournamentGroup as tournamentGroupTable } from '../../db/schema/tournament_group.ts';
import { tournamentGroupTournament as tournamentGroupTournamentTable } from '../../db/schema/tournament_group_tournament.ts';
import { tournament as tournamentTable } from '../../db/schema/tournament.ts';
import { meta as metaTable } from '../../db/schema/meta.ts';
import { withPagination } from '../../lib/withPagination.ts';

// Define query parameters schema
const zTournamentGroupQueryParams = z.object({
  meta: z.coerce.number().optional(),
  visible: z.coerce.boolean().optional(),
  limit: z.coerce.number().optional().default(100),
  offset: z.coerce.number().optional().default(0),
  sort: z.enum(['name', 'position', 'created_at']).optional().default('position'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
});

export const tournamentGroupGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('query', zTournamentGroupQueryParams),
  async c => {
    const { meta, visible, limit, offset, sort, order } = c.req.valid('query');

    const filters = [];

    // Meta filter - exact meta ID
    if (meta !== undefined) {
      filters.push(eq(tournamentGroupTable.metaId, meta));
    }

    // Visibility filter
    if (visible !== undefined) {
      filters.push(eq(tournamentGroupTable.visible, visible));
    }

    // Build the query with all filters
    let query = db
      .select({
        group: tournamentGroupTable,
        meta: metaTable,
        // Use a subquery with json_agg to aggregate tournaments into an array
        tournaments: sql`
          COALESCE(
            (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'tournament', to_jsonb(t.*),
                  'position', tgt.position
                ) ORDER BY tgt.position ASC
              )
              FROM ${tournamentGroupTournamentTable} tgt
              LEFT JOIN ${tournamentTable} t ON tgt.tournament_id = t.id
              WHERE tgt.group_id = ${tournamentGroupTable.id}
            ),
            '[]'::jsonb
          )
        `,
      })
      .from(tournamentGroupTable)
      .leftJoin(metaTable, eq(tournamentGroupTable.metaId, metaTable.id))
      .$dynamic();

    // Apply all filters
    if (filters.length > 0) {
      query = query.where(and(...filters));
    }

    // Apply pagination
    query = withPagination(query, limit, offset);

    // Apply sorting
    const groups = await query.orderBy(sql.raw(`tournament_group.${sort} ${order}`));

    return c.json({
      data: groups,
      pagination: {
        limit,
        offset,
        hasMore: groups.length === limit,
      },
    });
  },
);