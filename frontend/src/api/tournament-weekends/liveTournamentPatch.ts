import type {
  LiveTournamentHomePatch,
  LiveTournamentHomeResponse,
} from '../../../../types/TournamentWeekend.ts';

export function applyLiveTournamentHomePatch(
  current: LiveTournamentHomeResponse | undefined,
  patch: LiveTournamentHomePatch,
  meta: LiveTournamentHomeResponse['meta'],
): LiveTournamentHomeResponse | undefined {
  if (patch.kind === 'weekend_replace') {
    return {
      data: patch.detail,
      meta,
    };
  }

  if (!current?.data) {
    return current;
  }

  switch (patch.kind) {
    case 'weekend_summary':
      return {
        ...current,
        data: {
          ...current.data,
          weekend: patch.weekend,
        },
        meta,
      };
    case 'tournament_summary':
      return {
        ...current,
        data: {
          ...current.data,
          tournaments: current.data.tournaments.some(
            entry => entry.tournament.id === patch.tournament.tournament.id,
          )
            ? current.data.tournaments.map(entry =>
                entry.tournament.id === patch.tournament.tournament.id ? patch.tournament : entry,
              )
            : [...current.data.tournaments, patch.tournament],
        },
        meta,
      };
    case 'resources': {
      const deletedIds = new Set(patch.deletedResourceIds ?? []);

      return {
        ...current,
        data: {
          ...current.data,
          resources: patch.resources.filter(resource => !deletedIds.has(resource.id)),
        },
        meta,
      };
    }
    case 'watched_players':
      return {
        ...current,
        data: {
          ...current.data,
          watchlist: patch.watchlist,
          watchedPlayerDisplayNames: patch.watchedPlayerDisplayNames,
          watchedPlayers: patch.watchedPlayers,
        },
        meta,
      };
    case 'meta_groups':
      return {
        ...current,
        data: {
          ...current.data,
          tournamentGroups: patch.tournamentGroups,
        },
        meta,
      };
  }
}
