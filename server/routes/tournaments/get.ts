import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { and, eq, gte, lte, or, sql, lte as ltEqual } from 'drizzle-orm';
import { tournament as tournamentTable } from '../../db/schema/tournament.ts';
import { tournamentType as tournamentTypeTable } from '../../db/schema/tournament_type.ts';
import { meta as metaTable } from '../../db/schema/meta.ts';
import { tournamentDeck as tournamentDeckTable } from '../../db/schema/tournament_deck.ts';
import { deck as deckTable } from '../../db/schema/deck.ts';
import { db } from '../../db';
import { withPagination } from '../../lib/withPagination.ts';
import { zTournamentQueryParams } from '../../../types/ZTournamentParams.ts';
import { selectTournament, selectTournamentType, selectMeta } from '../tournament.ts';
import { selectDeck } from '../deck.ts';
import { user as userTable } from '../../db/schema/auth-schema.ts';
import { selectUser } from '../user.ts';
import { getTableColumns } from 'drizzle-orm';

// Create a select function for tournament deck
const selectTournamentDeck = getTableColumns(tournamentDeckTable);

export const tournamentGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('query', zTournamentQueryParams),
  async c => {
    const {
      type,
      minType,
      season,
      minSeason,
      set,
      meta,
      location,
      continent,
      minAttendance,
      format,
      days,
      minDate,
      maxDate,
      limit,
      offset,
      sort,
      order,
    } = c.req.valid('query');

    const filters = [];

    // Type filter - either exact type or minimum sort value
    if (type) {
      filters.push(eq(tournamentTable.type, type));
    } else if (minType !== undefined) {
      // We need to join with tournamentTypeTable to filter by sort value
      filters.push(gte(tournamentTypeTable.sortValue, minType));
    }

    // Meta filter - exact meta ID
    if (meta !== undefined) {
      filters.push(eq(tournamentTable.meta, meta));
    }

    // Season filter - either exact season or minimum season (now in meta table)
    if (season !== undefined) {
      filters.push(eq(metaTable.season, season));
    } else if (minSeason !== undefined) {
      filters.push(gte(metaTable.season, minSeason));
    }

    // Set filter - exact set only (now in meta table)
    if (set) {
      filters.push(eq(metaTable.set, set));
    }

    // Location filter
    if (location) {
      filters.push(eq(tournamentTable.location, location));
    }

    // Continent filter
    if (continent) {
      filters.push(eq(tournamentTable.continent, continent));
    }

    // Minimum attendance filter
    if (minAttendance !== undefined) {
      filters.push(gte(tournamentTable.attendance, minAttendance));
    }

    // Format filter
    if (format !== undefined) {
      filters.push(eq(tournamentTable.format, format));
    }

    // Days filter - exact number of days
    if (days !== undefined) {
      filters.push(eq(tournamentTable.days, days));
    }

    // Date range filters
    if (minDate) {
      filters.push(gte(tournamentTable.date, new Date(minDate)));
    }
    if (maxDate) {
      filters.push(lte(tournamentTable.date, new Date(maxDate)));
    }

    // Build the query with all filters and use PostgreSQL's json_agg to group decks by tournament
    let query = db
      .select({
        tournament: selectTournament,
        tournamentType: selectTournamentType,
        user: selectUser,
        meta: selectMeta,
        // Use a subquery with json_agg to aggregate decks into an array
        decks: sql`
          COALESCE(
            (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'tournamentDeck', to_jsonb(td.*),
                  'deck', to_jsonb(d.*)
                )
              )
              FROM ${tournamentDeckTable} td
              LEFT JOIN ${deckTable} d ON td.deck_id = d.id
              WHERE td.tournament_id = ${tournamentTable.id}
              AND td.placement <= 3
            ),
            '[]'::jsonb
          )
        `,
      })
      .from(tournamentTable)
      .innerJoin(tournamentTypeTable, eq(tournamentTable.type, tournamentTypeTable.id))
      .innerJoin(userTable, eq(tournamentTable.userId, userTable.id))
      .leftJoin(metaTable, eq(tournamentTable.meta, metaTable.id))
      .$dynamic();

    // Apply all filters
    if (filters.length > 0) {
      query = query.where(and(...filters));
    }

    // Apply pagination
    query = withPagination(query, limit, offset);

    // Apply sorting
    const tournaments = await query.orderBy(sql.raw(`${sort} ${order}`));

    return c.json({
      data: tournaments,
      pagination: {
        limit,
        offset,
        hasMore: tournaments.length === limit,
      },
    });
  },
);
