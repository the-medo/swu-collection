import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { and, eq, gte, lte, or, sql } from 'drizzle-orm';
import { tournament as tournamentTable } from '../../db/schema/tournament.ts';
import { tournamentType as tournamentTypeTable } from '../../db/schema/tournament_type.ts';
import { db } from '../../db';
import { withPagination } from '../../lib/withPagination.ts';
import { zTournamentQueryParams } from '../../../types/ZTournamentParams.ts';
import { selectTournament, selectTournamentType } from '../tournament.ts';
import { user as userTable } from '../../db/schema/auth-schema.ts';
import { selectUser } from '../user.ts';

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
      minMetaShakeup,
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

    // Season filter - either exact season or minimum season
    if (season !== undefined) {
      filters.push(eq(tournamentTable.season, season));
    } else if (minSeason !== undefined) {
      filters.push(gte(tournamentTable.season, minSeason));
    }

    // Set filter - exact set only
    if (set) {
      filters.push(eq(tournamentTable.set, set));
    }

    // Meta shakeup filter - events after a specific meta change
    if (minMetaShakeup) {
      filters.push(gte(tournamentTable.metaShakeup, minMetaShakeup));
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

    // Build the query with all filters
    let query = db
      .select({
        tournament: selectTournament,
        tournamentType: selectTournamentType,
        user: selectUser,
      })
      .from(tournamentTable)
      .innerJoin(tournamentTypeTable, eq(tournamentTable.type, tournamentTypeTable.id))
      .innerJoin(userTable, eq(tournamentTable.userId, userTable.id))
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
