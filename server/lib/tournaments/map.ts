import { and, asc, gte, lte, sql } from 'drizzle-orm';
import { db } from '../../db';
import { tournament } from '../../db/schema/tournament.ts';
import { eventHighlight } from '../../db/schema/event_highlight.ts';
import { fourMonthWindow } from '../../../shared/lib/tournamentMapDates.ts';
import { tournamentMapWindow } from './mapWindow.ts';
import type { TournamentMapResponse } from '../../../types/TournamentMap.ts';

// Preserve PostgreSQL microseconds in both row versions and the inclusive cursor.
const updatedAt = sql<string>`to_char(${tournament.updatedAt}, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

export async function getTournamentMap(
  query: { from?: string; to?: string; updatedSince?: string } = {},
): Promise<TournamentMapResponse> {
  const range = query.from
    ? { from: query.from, to: query.to ?? fourMonthWindow(query.from).to }
    : tournamentMapWindow;
  const { updatedSince } = query;
  return db.transaction(
    async tx => {
      const scope = and(
        gte(tournament.date, sql`${range.from}::date`),
        lte(tournament.date, sql`${range.to}::date`),
      );
      const versions = await tx
        .select({ id: tournament.id, date: sql<string>`${tournament.date}::text`, updatedAt })
        .from(tournament)
        .where(scope);
      const rows = await tx
        .select({
          id: tournament.id,
          name: tournament.name,
          date: tournament.date,
          days: tournament.days,
          type: tournament.type,
          format: tournament.format,
          location: tournament.location,
          meleeId: tournament.meleeId,
          coordinates: tournament.coordinates,
          additionalInfo: tournament.additionalInfo,
          updatedAt,
        })
        .from(tournament)
        .where(
          and(
            scope,
            updatedSince ? gte(tournament.updatedAt, sql`${updatedSince}::timestamp`) : undefined,
          ),
        );
      return {
        window: tournamentMapWindow,
        range,
        highlights: await tx
          .select()
          .from(eventHighlight)
          .orderBy(asc(eventHighlight.date), asc(eventHighlight.id)),
        tournaments: rows.map(row => ({ ...row, date: row.date.toISOString().slice(0, 10) })),
        versions,
        updatedAt: versions.reduce<string | null>(
          (latest, row) => (!latest || row.updatedAt > latest ? row.updatedAt : latest),
          null,
        ),
      };
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );
}
