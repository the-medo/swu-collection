import type {
  LiveTournamentHomeDetail,
  LiveTournamentHomePatch,
  LiveTournamentHomePatchEvent,
  LiveTournamentHomeResponse,
} from '../../../types/TournamentWeekend.ts';
import {
  getLiveTournamentHome,
  getLiveTournamentHomeMetaGroups,
  getLiveTournamentHomeResources,
  getLiveTournamentHomeTournamentSummary,
  getLiveTournamentHomeWatchedPlayers,
} from './tournamentWeekendLiveHome.ts';
import { publishLiveTournamentHomePatchEvent } from '../ws/liveTournamentRealtime.ts';

const liveHomeCacheTtlMs = 30 * 1000;
const publicUserKey = 'public';

type CacheEntry = {
  data: LiveTournamentHomeDetail | null;
  generatedAt: string;
  expiresAt: number;
  version: number;
};

const entries = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<CacheEntry>>();
const versionByWeekendId = new Map<string, number>();

const cacheKey = (weekendId: string, userId?: string) => `${weekendId}:${userId ?? publicUserKey}`;
const keyPrefix = (weekendId: string) => `${weekendId}:`;

export const getLiveTournamentHomeVersion = (weekendId: string) =>
  versionByWeekendId.get(weekendId) ?? 0;

const bumpLiveTournamentHomeVersion = (weekendId: string) => {
  const nextVersion = getLiveTournamentHomeVersion(weekendId) + 1;
  versionByWeekendId.set(weekendId, nextVersion);
  return nextVersion;
};

const createEntry = (
  data: LiveTournamentHomeDetail | null,
  version: number,
  now = Date.now(),
): CacheEntry => ({
  data,
  generatedAt: new Date(now).toISOString(),
  expiresAt: now + liveHomeCacheTtlMs,
  version,
});

const toResponse = (entry: CacheEntry): LiveTournamentHomeResponse => ({
  data: entry.data,
  meta: {
    generatedAt: entry.generatedAt,
    version: entry.version,
  },
});

const buildCacheEntry = async (weekendId: string, userId?: string) => {
  const version = getLiveTournamentHomeVersion(weekendId);
  const data = await getLiveTournamentHome(weekendId, userId);
  return createEntry(data, version);
};

const applyPatch = (
  data: LiveTournamentHomeDetail | null,
  patch: LiveTournamentHomePatch,
): LiveTournamentHomeDetail | null => {
  if (patch.kind === 'weekend_replace') {
    return patch.detail;
  }

  if (!data) {
    return data;
  }

  switch (patch.kind) {
    case 'weekend_summary':
      return {
        ...data,
        weekend: patch.weekend,
      };
    case 'tournament_summary':
      return {
        ...data,
        tournaments: data.tournaments.some(
          entry => entry.tournament.id === patch.tournament.tournament.id,
        )
          ? data.tournaments.map(entry =>
              entry.tournament.id === patch.tournament.tournament.id ? patch.tournament : entry,
            )
          : [...data.tournaments, patch.tournament],
      };
    case 'resources': {
      const deletedIds = new Set(patch.deletedResourceIds ?? []);
      return {
        ...data,
        resources: patch.resources.filter(resource => !deletedIds.has(resource.id)),
      };
    }
    case 'watched_players':
      return {
        ...data,
        watchlist: patch.watchlist,
        watchedPlayerDisplayNames: patch.watchedPlayerDisplayNames,
        watchedPlayers: patch.watchedPlayers,
      };
    case 'meta_groups':
      return {
        ...data,
        tournamentGroups: patch.tournamentGroups,
      };
  }
};

const patchCachedEntries = (
  weekendId: string,
  patch: LiveTournamentHomePatch,
  version: number,
  userId?: string,
) => {
  if (patch.kind === 'weekend_replace' && userId === undefined) {
    [...entries.keys()]
      .filter(key => key.startsWith(keyPrefix(weekendId)))
      .forEach(key => entries.delete(key));

    entries.set(cacheKey(weekendId), createEntry(patch.detail, version));
    return;
  }

  const keys =
    userId !== undefined
      ? [cacheKey(weekendId, userId)].filter(key => entries.has(key))
      : [...entries.keys()].filter(key => key.startsWith(keyPrefix(weekendId)));

  const now = Date.now();
  keys.forEach(key => {
    const entry = entries.get(key);
    if (!entry) return;

    entries.set(key, createEntry(applyPatch(entry.data, patch), version, now));
  });
};

const createPatchEvent = async (
  type: LiveTournamentHomePatchEvent['type'],
  weekendId: string,
  patch: LiveTournamentHomePatch,
  userId?: string,
): Promise<LiveTournamentHomePatchEvent> => {
  const version = userId
    ? getLiveTournamentHomeVersion(weekendId)
    : bumpLiveTournamentHomeVersion(weekendId);
  patchCachedEntries(weekendId, patch, version, userId);

  const event = {
    type,
    data: {
      weekendId,
      version,
      patch,
    },
    at: new Date().toISOString(),
  };

  publishLiveTournamentHomePatchEvent(event, { userId });
  return event;
};

export const clearLiveTournamentHomeCache = (weekendId: string) => {
  [...entries.keys()]
    .filter(key => key.startsWith(keyPrefix(weekendId)))
    .forEach(key => entries.delete(key));
  return bumpLiveTournamentHomeVersion(weekendId);
};

export async function getCachedLiveTournamentHomeResponse(
  weekendId: string,
  userId?: string,
): Promise<LiveTournamentHomeResponse> {
  const key = cacheKey(weekendId, userId);
  const version = getLiveTournamentHomeVersion(weekendId);
  const now = Date.now();
  const cached = entries.get(key);

  if (cached && cached.version === version && cached.expiresAt > now) {
    return toResponse(cached);
  }

  const existingBuild = inFlight.get(key);
  if (existingBuild) {
    return toResponse(await existingBuild);
  }

  const build = buildCacheEntry(weekendId, userId).finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, build);

  const entry = await build;
  entries.set(key, entry);

  return toResponse(entry);
}

export async function createLiveWeekendReplacePatchEvent(
  weekendId: string,
): Promise<LiveTournamentHomePatchEvent> {
  const detail = await getLiveTournamentHome(weekendId);
  return createPatchEvent('live_weekend.replaced', weekendId, {
    kind: 'weekend_replace',
    detail,
  });
}

export async function createLiveWeekendSummaryPatchEvent(
  weekendId: string,
): Promise<LiveTournamentHomePatchEvent | null> {
  const detail = await getLiveTournamentHome(weekendId);
  if (!detail) return null;

  return createPatchEvent('live_weekend.summary_updated', weekendId, {
    kind: 'weekend_summary',
    weekend: detail.weekend,
  });
}

export async function createLiveTournamentSummaryPatchEvent(
  type:
    | 'live_tournament.updated'
    | 'live_tournament.progress_updated'
    | 'tournament_import.finished',
  weekendId: string,
  tournamentId: string,
): Promise<LiveTournamentHomePatchEvent | null> {
  const tournament = await getLiveTournamentHomeTournamentSummary(weekendId, tournamentId);
  if (!tournament) return null;

  return createPatchEvent(type, weekendId, {
    kind: 'tournament_summary',
    tournament,
  });
}

export async function createLiveResourcesPatchEvent(
  type: 'live_resource.upserted' | 'live_resource.deleted',
  weekendId: string,
  deletedResourceIds?: string[],
): Promise<LiveTournamentHomePatchEvent> {
  const resources = await getLiveTournamentHomeResources(weekendId);

  return createPatchEvent(type, weekendId, {
    kind: 'resources',
    resources,
    deletedResourceIds,
  });
}

export async function createLiveMetaGroupsPatchEvent(
  weekendId: string,
): Promise<LiveTournamentHomePatchEvent> {
  const tournamentGroups = await getLiveTournamentHomeMetaGroups(weekendId);

  return createPatchEvent('live_weekend.summary_updated', weekendId, {
    kind: 'meta_groups',
    tournamentGroups,
  });
}

export async function createLiveWatchedPlayersPatchEvent(
  weekendId: string,
  userId: string,
): Promise<LiveTournamentHomePatchEvent> {
  const watchedData = await getLiveTournamentHomeWatchedPlayers(weekendId, userId);

  return createPatchEvent(
    'player_watch.updated',
    weekendId,
    {
      kind: 'watched_players',
      ...watchedData,
    },
    userId,
  );
}
