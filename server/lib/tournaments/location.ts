import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { tournament } from '../../db/schema/tournament.ts';
import { meta } from '../../db/schema/meta.ts';
import type {
  TournamentAdditionalInfo,
  TournamentCoordinatesResult,
  TournamentLocationData,
} from '../../../types/TournamentLocation.ts';
import { zTournamentAdditionalInfo } from '../../../types/TournamentLocation.ts';
import {
  clearGeocoding,
  geocodeTournament,
  locationInput,
  TournamentLocationError,
} from './geocoding.ts';

const fields = {
  id: tournament.id,
  name: tournament.name,
  location: tournament.location,
  date: tournament.date,
  coordinates: tournament.coordinates,
  additionalInfo: tournament.additionalInfo,
};
type Row = Omit<TournamentLocationData, 'date'> & { date: Date };
const serialize = (row: Row): TournamentLocationData => ({ ...row, date: row.date.toISOString() });

async function get(id: string) {
  const [row] = await db.select(fields).from(tournament).where(eq(tournament.id, id));
  if (!row) throw new TournamentLocationError('Tournament not found.', 404);
  return row;
}

// Compare the JSON and country read before a provider call, so a concurrent edit is never lost.
function unchanged(row: Row) {
  return and(
    eq(tournament.id, row.id),
    eq(tournament.location, row.location),
    eq(tournament.additionalInfo, row.additionalInfo),
  );
}
function requireSaved(rows: Row[]) {
  if (!rows[0])
    throw new TournamentLocationError('Tournament changed. Reload it before saving again.', 409);
  return serialize(rows[0]);
}

export const tournamentLocationService = {
  async list(set?: string) {
    const rows = await db
      .select(fields)
      .from(tournament)
      .leftJoin(meta, eq(tournament.meta, meta.id))
      .where(and(eq(tournament.type, 'pq'), set ? eq(meta.set, set) : undefined))
      .orderBy(desc(tournament.date), tournament.id);
    return rows.map(serialize);
  },
  async save(
    id: string,
    additionalInfo: TournamentAdditionalInfo,
    expectedAdditionalInfo: TournamentAdditionalInfo,
  ) {
    const row = await get(id);
    const addressChanged =
      JSON.stringify(locationInput(row.additionalInfo, row.location)) !==
      JSON.stringify(locationInput(additionalInfo, row.location));
    const rows = await db
      .update(tournament)
      .set({
        additionalInfo: addressChanged ? clearGeocoding(additionalInfo) : additionalInfo,
        ...(addressChanged ? { coordinates: null } : {}),
        updatedAt: sql`NOW()`,
      })
      .where(and(unchanged(row), eq(tournament.additionalInfo, expectedAdditionalInfo)))
      .returning(fields);
    return requireSaved(rows);
  },
  async compute(
    id: string,
    force: boolean,
    geocoder = geocodeTournament,
  ): Promise<TournamentCoordinatesResult> {
    const row = await get(id);
    if (row.coordinates && !force) return { status: 'skipped', tournament: serialize(row) };
    const result = await geocoder(row.additionalInfo, row.location);
    // Include provider metadata in the same size limit as manually edited info.
    if (!zTournamentAdditionalInfo.safeParse(result.additionalInfo).success)
      throw new TournamentLocationError(
        'Additional info is too large to save geocoding data.',
        400,
      );
    const rows = await db
      .update(tournament)
      .set({ ...result, updatedAt: sql`NOW()` })
      .where(unchanged(row))
      .returning(fields);
    return { status: 'updated', tournament: requireSaved(rows) };
  },
};
