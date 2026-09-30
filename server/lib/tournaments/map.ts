import { and, asc, gte, lte, sql } from 'drizzle-orm';
import { db } from '../../db';
import { tournament } from '../../db/schema/tournament.ts';
import { eventHighlight } from '../../db/schema/event_highlight.ts';
import { fourMonthWindow } from '../../../shared/lib/tournamentMapDates.ts';
import { tournamentMapWindow } from './mapWindow.ts';
import type { TournamentMapResponse } from '../../../types/TournamentMap.ts';
import { tournamentMapColumns, tournamentMapUpdatedAt as updatedAt } from './mapProjection.ts';

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
        .select(tournamentMapColumns)
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
        tournaments: rows,
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
