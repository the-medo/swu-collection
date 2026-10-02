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

    const clearRefetchTimer = () => {
      if (refetchTimerRef.current !== null) {
        window.clearTimeout(refetchTimerRef.current);
        refetchTimerRef.current = null;
      }
    };

    const scheduleRefetch = () => {
      clearRefetchTimer();
      refetchTimerRef.current = window.setTimeout(() => {
        queryClient.refetchQueries({ queryKey: liveQueryKey });
      }, 250);
    };

    const handlePatchEvent = (payload: LiveTournamentHomePatchEvent) => {
      let shouldRefetch = false;

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

        if (!next) {
          shouldRefetch = true;
        }

        return next;
      });

      if (shouldRefetch) {
        scheduleRefetch();
      }
    };

    const unlisten = realtime.listen(event => {
      if (event.type === 'app.resync') {
        scheduleRefetch();
        return;
      }
      if (!event.type.startsWith('live_') || !event.data || typeof event.data !== 'object') return;
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
