import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth-client.ts';
import { getLiveTournamentWsUrl } from '@/lib/liveTournamentWsUrl.ts';
import type {
  LiveTournamentHomePatchEvent,
  LiveTournamentHomeResponse,
  LiveTournamentHomeSocketEvent,
} from '../../../../types/TournamentWeekend.ts';
import { applyLiveTournamentHomePatch } from './liveTournamentPatch.ts';
import { tournamentWeekendQueryKeys } from './queryKeys';

const maxReconnectDelayMs = 10_000;

function isPatchEvent(
  payload: LiveTournamentHomeSocketEvent,
): payload is LiveTournamentHomePatchEvent {
  const data = payload.data as { patch?: unknown } | undefined;
  return !!data && typeof data === 'object' && 'patch' in data;
}

export const useLiveTournamentSocket = (weekendId: string | undefined) => {
  const session = useSession();
  const queryClient = useQueryClient();
  const reconnectTimerRef = useRef<number | null>(null);
  const refetchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const currentUserId = session.data?.user.id;
    if (!weekendId || !currentUserId) {
      return;
    }

    let ws: WebSocket | null = null;
    let shouldReconnect = true;
    let reconnectAttempt = 0;

    const liveQueryKey = tournamentWeekendQueryKeys.live();

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

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

    const scheduleReconnect = () => {
      if (!shouldReconnect) return;

      reconnectAttempt += 1;
      const delay = Math.min(1000 * 2 ** Math.min(reconnectAttempt, 4), maxReconnectDelayMs);

      clearReconnectTimer();
      reconnectTimerRef.current = window.setTimeout(() => {
        connect();
      }, delay);
    };

    const handleConnected = (payload: LiveTournamentHomeSocketEvent) => {
      if (payload.type !== 'live_weekend.connected') return;

      const current = queryClient.getQueryData<LiveTournamentHomeResponse>(liveQueryKey);
      const currentVersion = current?.meta.version ?? 0;

      if (payload.data.version > currentVersion) {
        scheduleRefetch();
      }
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

    const connect = () => {
      if (!shouldReconnect) return;

      ws = new WebSocket(getLiveTournamentWsUrl(weekendId));

      ws.onopen = () => {
        reconnectAttempt = 0;
      };

      ws.onmessage = event => {
        let payload: LiveTournamentHomeSocketEvent | null = null;

        try {
          payload = JSON.parse(String(event.data)) as LiveTournamentHomeSocketEvent;
        } catch {
          return;
        }

        if (!payload || typeof payload.type !== 'string') {
          return;
        }

        if (payload.type === 'live_weekend.connected') {
          handleConnected(payload);
          return;
        }

        if (isPatchEvent(payload)) {
          handlePatchEvent(payload);
        }
      };

      ws.onclose = () => {
        ws = null;
        scheduleReconnect();
      };

      ws.onerror = () => {
        // onclose handles reconnect scheduling
      };
    };

    connect();

    return () => {
      shouldReconnect = false;
      clearReconnectTimer();
      clearRefetchTimer();

      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close(1000, 'Component unmounted');
      }
    };
  }, [queryClient, session.data?.user.id, weekendId]);
};
