import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '../../db';
import { tournament } from '../../db/schema/tournament.ts';
import { meta } from '../../db/schema/meta.ts';
import type { SwuSet } from '../../../types/enums.ts';
import type { TournamentMapResponse } from '../../../types/TournamentMap.ts';

// Preserve PostgreSQL microseconds in both row versions and the inclusive cursor.
const updatedAt = sql<string>`to_char(${tournament.updatedAt}, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

export async function getTournamentMap(
  set: SwuSet,
  updatedSince?: string,
): Promise<TournamentMapResponse> {
  return db.transaction(
    async tx => {
      const scope = eq(meta.set, set);
      const versions = await tx
        .select({ id: tournament.id, updatedAt })
        .from(tournament)
        .innerJoin(meta, eq(tournament.meta, meta.id))
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
        .innerJoin(meta, eq(tournament.meta, meta.id))
        .where(
          and(
            scope,
            updatedSince ? gte(tournament.updatedAt, sql`${updatedSince}::timestamp`) : undefined,
          ),
        );
      return {
        set,
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
