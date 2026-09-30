import { db } from './db';
import { rangeDates } from '../../../shared/lib/tournamentMapDates.ts';
import type { EventHighlight } from '../../../types/EventHighlight.ts';
import type {
  MapTournament,
  TournamentMapData,
  TournamentMapRange,
  TournamentMapResponse,
} from '../../../types/TournamentMap.ts';

export interface TournamentMapDay {
  date: string;
  updatedAt: string | null;
}
export interface TournamentMapState {
  key: 'main';
  window: TournamentMapRange;
  highlights: EventHighlight[];
  revision: string;
}
export interface TournamentMapCache {
  state: TournamentMapState | undefined;
  range: TournamentMapRange | undefined;
  tournaments: MapTournament[];
  days: TournamentMapDay[];
}

export async function getTournamentMapCache(
  requested?: TournamentMapRange,
): Promise<TournamentMapCache> {
  return db.transaction(
    'r',
    db.mapTournaments,
    db.tournamentMapDays,
    db.tournamentMapState,
    async () => {
      const state = await db.tournamentMapState.get('main');
      const range = requested ?? state?.window;
      return {
        state,
        range,
        tournaments: range
          ? await db.mapTournaments
              .where('date')
              .between(range.from, range.to, true, true)
              .toArray()
          : [],
        days: range
          ? await db.tournamentMapDays
              .where('date')
              .between(range.from, range.to, true, true)
              .toArray()
          : [],
      };
    },
  );
}

export function cachedMapData(cache: TournamentMapCache): TournamentMapData | undefined {
  if (!cache.state || !cache.range || cache.days.length !== rangeDates(cache.range).length) return;
  return {
    window: cache.state.window,
    range: cache.range,
    tournaments: cache.tournaments,
    highlights: cache.state.highlights,
  };
}

// Full payloads only for missing dates; covered spans use their oldest update cursor.
export function mapSyncRequests(range: TournamentMapRange, days: TournamentMapDay[]) {
  const covered = new Map(days.map(day => [day.date, day.updatedAt]));
  const spans: { from: string; to: string; cached: boolean; updatedSince?: string }[] = [];
  for (const date of rangeDates(range)) {
    const cached = covered.has(date);
    const cursor = covered.get(date) ?? undefined;
    const previous = spans[spans.length - 1];
    if (previous && previous.cached === cached) {
      previous.to = date;
      if (cursor && (!previous.updatedSince || cursor < previous.updatedSince))
        previous.updatedSince = cursor;
    } else spans.push({ from: date, to: date, cached, updatedSince: cursor });
  }
  return spans.map(({ from, to, updatedSince }) => ({ from, to, updatedSince }));
}

export function mergeTournamentMap(
  cached: MapTournament[],
  response: TournamentMapResponse,
): MapTournament[] | null {
  const rows = new Map(cached.map(row => [row.id, row]));
  for (const row of response.tournaments) rows.set(row.id, row);
  const result: MapTournament[] = [];
  for (const version of response.versions) {
    const row = rows.get(version.id);
    // Date moves and late transaction commits can be absent from a delta.
    if (!row || row.updatedAt !== version.updatedAt || row.date !== version.date) return null;
    result.push(row);
  }
  return result.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}

export async function storeTournamentMapCache(
  cache: TournamentMapCache,
  responses: TournamentMapResponse[],
) {
  return db.transaction(
    'rw',
    db.mapTournaments,
    db.tournamentMapDays,
    db.tournamentMapState,
    async () => {
      const current = await db.tournamentMapState.get('main');
      // A concurrent tab/refetch must not overwrite a newer snapshot or its cursors.
      if (current?.revision !== cache.state?.revision) return false;
      const rows = new Map<string, MapTournament>();
      for (const response of responses) {
        await db.mapTournaments
          .where('date')
          .between(response.range.from, response.range.to, true, true)
          .delete();
        for (const row of response.tournaments) {
          const previous = rows.get(row.id);
          if (!previous || row.updatedAt >= previous.updatedAt) rows.set(row.id, row);
        }
        await db.tournamentMapDays.bulkPut(
          rangeDates(response.range).map(date => ({ date, updatedAt: response.updatedAt })),
        );
      }
      await db.mapTournaments.bulkPut([...rows.values()]);
      const latest = responses[responses.length - 1]!;
      await db.tournamentMapState.put({
        key: 'main',
        window: latest.window,
        highlights: latest.highlights,
        revision: crypto.randomUUID(),
      });
      return true;
    },
  );
}
