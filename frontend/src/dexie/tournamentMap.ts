import { db } from './db';
import type { SwuSet } from '../../../types/enums.ts';
import type { MapTournament, TournamentMapResponse } from '../../../types/TournamentMap.ts';

export interface TournamentMapCache {
  set: SwuSet;
  tournaments: MapTournament[];
  updatedAt: string | null;
  revision: string;
}

export const getTournamentMapCache = (set: SwuSet) => db.tournamentMapCache.get(set);

export function mergeTournamentMap(
  cached: TournamentMapCache | undefined,
  response: TournamentMapResponse,
): MapTournament[] | null {
  const rows = new Map(
    (cached?.set === response.set ? cached.tournaments : []).map(row => [row.id, row]),
  );
  for (const row of response.tournaments) rows.set(row.id, row);
  const result: MapTournament[] = [];
  for (const version of response.versions) {
    const row = rows.get(version.id);
    // A meta moved sets or a transaction committed with an older updatedAt.
    // Request a full snapshot rather than silently retaining incomplete data.
    if (!row || row.updatedAt !== version.updatedAt) return null;
    result.push(row);
  }
  return result.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}

export async function storeTournamentMapCache(
  cached: TournamentMapCache | undefined,
  response: TournamentMapResponse,
  tournaments: MapTournament[],
) {
  return db.transaction('rw', db.tournamentMapCache, async () => {
    const current = await getTournamentMapCache(response.set);
    // Another tab/refetch already advanced this set while the request was in flight.
    if (current && current.revision !== cached?.revision) return current;
    const next: TournamentMapCache = {
      set: response.set,
      tournaments,
      updatedAt: response.updatedAt,
      revision: crypto.randomUUID(),
    };
    await db.tournamentMapCache.put(next);
    return next;
  });
}
