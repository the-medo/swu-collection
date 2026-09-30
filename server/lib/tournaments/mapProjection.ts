import { sql } from 'drizzle-orm';
import { tournament } from '../../db/schema/tournament.ts';

// Preserve PostgreSQL microseconds in both row versions and the inclusive map cursor.
export const tournamentMapUpdatedAt = sql<string>`to_char(${tournament.updatedAt}, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
// Public event fields shared by map sync and each user's private saved list.
export const tournamentMapColumns = {
  id: tournament.id,
  name: tournament.name,
  date: sql<string>`${tournament.date}::text`,
  days: tournament.days,
  type: tournament.type,
  format: tournament.format,
  location: tournament.location,
  meleeId: tournament.meleeId,
  coordinates: tournament.coordinates,
  additionalInfo: tournament.additionalInfo,
  updatedAt: tournamentMapUpdatedAt,
};
