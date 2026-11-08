import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth-client.ts';
import { useAppRealtime } from '@/components/app/realtime/context.ts';
import type {
  LiveTournamentHomePatchEvent,
  LiveTournamentHomeResponse,
  LiveTournamentHomeSocketEvent,
} from '../../../../types/TournamentWeekend.ts';
import { applyLiveTournamentHomePatch } from './liveTournamentPatch.ts';
import { tournamentWeekendQueryKeys } from './queryKeys';

function isPatchEvent(
  payload: LiveTournamentHomeSocketEvent,
): payload is LiveTournamentHomePatchEvent {
  const data = payload.data as { patch?: unknown } | undefined;
  return !!data && typeof data === 'object' && 'patch' in data;
}

export const useLiveTournamentSocket = (weekendId: string | undefined) => {
  const session = useSession();
  const queryClient = useQueryClient();
  const realtime = useAppRealtime();
  const refetchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const currentUserId = session.data?.user.id;
    if (!weekendId || !currentUserId || !realtime) {
      return;
    }

    const liveQueryKey = tournamentWeekendQueryKeys.live();
    const roundsToRefresh = new Set<string>();
    let refreshAllRounds = false;
    let refreshHome = false;

    const refreshRounds = async (queryKey: readonly string[]) => {
      // An update can arrive during the first load, before Query has any cached data.
      // Cancel that snapshot too so it cannot hide the newer result.
      await queryClient.cancelQueries({ queryKey, type: 'active' });
      // Closed rows have no observers: mark cached history stale without fetching it.
      await queryClient.invalidateQueries({ queryKey, refetchType: 'active' });
    };

    const clearRefetchTimer = () => {
      if (refetchTimerRef.current !== null) {
        window.clearTimeout(refetchTimerRef.current);
        refetchTimerRef.current = null;
      }
    };

    const scheduleRefetch = (tournamentId?: string, includeHome = true) => {
      if (tournamentId) roundsToRefresh.add(tournamentId);
      else refreshAllRounds = true;
      refreshHome ||= includeHome;
      clearRefetchTimer();
      refetchTimerRef.current = window.setTimeout(
        () => {
          refetchTimerRef.current = null;
          if (refreshHome) queryClient.refetchQueries({ queryKey: liveQueryKey });
          const roundKeys = refreshAllRounds
            ? [tournamentWeekendQueryKeys.watchedPlayerRounds(weekendId, currentUserId)]
            : [...roundsToRefresh].map(id =>
                tournamentWeekendQueryKeys.watchedTournamentRounds(weekendId, currentUserId, id),
              );
          for (const queryKey of roundKeys) {
            void refreshRounds(queryKey);
          }
          roundsToRefresh.clear();
          refreshAllRounds = false;
          refreshHome = false;
        },
        250 + Math.floor(Math.random() * 500),
      );
    };

    const handlePatchEvent = (payload: LiveTournamentHomePatchEvent) => {
      let shouldRefetch = false;
      let accepted = false;

      queryClient.setQueryData<LiveTournamentHomeResponse | undefined>(liveQueryKey, current => {
        const currentVersion = current?.meta.version ?? 0;
        const eventVersion = payload.data.version;
        const isUserPatch = payload.data.patch.kind === 'watched_players';

        if (eventVersion < currentVersion) {
          return current;
        }

        if (!isUserPatch && eventVersion === currentVersion) {
          return current;
        }

        if (current && eventVersion > currentVersion + 1) {
          shouldRefetch = true;
          return current;
        }

        if (current && isUserPatch && eventVersion > currentVersion) {
          shouldRefetch = true;
          return current;
        }

        const next = applyLiveTournamentHomePatch(current, payload.data.patch, {
          generatedAt: payload.at,
          version: eventVersion,
        });
        accepted = true;

        if (
          current?.data?.watchlist.length &&
          (payload.data.patch.kind === 'tournament_summary' ||
            payload.data.patch.kind === 'weekend_replace')
        ) {
          shouldRefetch = true;
        }

        if (!next) {
          shouldRefetch = true;
        }

        return next;
      });

      if (shouldRefetch) {
        scheduleRefetch(
          accepted && payload.data.patch.kind === 'tournament_summary'
            ? payload.data.patch.tournament.tournament.id
            : undefined,
        );
      } else if (
        payload.data.patch.kind === 'tournament_summary' ||
        payload.data.patch.kind === 'weekend_replace' ||
        payload.data.patch.kind === 'watched_players'
      ) {
        // The homepage can already have this version after an HTTP refresh while an
        // independently cached open history still needs the corresponding update.
        scheduleRefetch(
          payload.data.patch.kind === 'tournament_summary'
            ? payload.data.patch.tournament.tournament.id
            : undefined,
          false,
        );
      }
    };

    const unlisten = realtime.listen(event => {
      if (event.type === 'app.resync') {
        scheduleRefetch();
        return;
      }
      if (
        (!event.type.startsWith('live_') &&
          event.type !== 'player_watch.updated' &&
          event.type !== 'tournament_import.finished') ||
        !event.data ||
        typeof event.data !== 'object'
      )
        return;
      const payload = event as unknown as LiveTournamentHomeSocketEvent;
      if (payload.data.weekendId !== weekendId) return;
      if (payload.type === 'live_weekend.connected') {
        // Reconnect can miss account-specific watched-player patches at the same version.
        scheduleRefetch();
      } else if (isPatchEvent(payload)) handlePatchEvent(payload);
    });
    const unsubscribe = realtime.subscribe({ topic: 'live-tournaments', weekendId });
    return () => {
      unlisten();
      unsubscribe();
      clearRefetchTimer();
    };
  }, [queryClient, session.data?.user.id, weekendId, realtime]);
};
