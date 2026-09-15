import * as React from 'react';
import { createContext, useContext, useEffect } from 'react';
import {
  StatisticsHistoryData,
  useGameResults,
} from '@/components/app/statistics/useGameResults.ts';
import { useSearch } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { authClient, useSession } from '@/lib/auth-client.ts';
import { getGameResultsWsUrl } from '@/lib/gameResultsWsUrl.ts';
import { GameResult } from '../../../../../server/db/schema/game_result.ts';
import type { GameResultsScope } from '../../../../../shared/types/game-results-realtime.ts';

const GameResultsContext = createContext<StatisticsHistoryData | undefined>(undefined);
const authCloseCodes = new Set([4401, 4403]);

interface GameResultsProviderProps {
  teamId?: string;
  children: React.ReactNode;
}

interface GameResultsEvent {
  type?: string;
  scope?: GameResultsScope;
  data?: GameResult;
  meta?: {
    teamIds?: string[];
  };
}

export const GameResultsProvider: React.FC<GameResultsProviderProps> = ({ teamId, children }) => {
  const { sDateRangeFrom, sDateRangeTo } = useSearch({ strict: false });
  const session = useSession();
  const queryClient = useQueryClient();
  const reconnectTimerRef = React.useRef<number | null>(null);

  const gameResultData = useGameResults({
    datetimeFrom: sDateRangeFrom,
    datetimeTo: sDateRangeTo,
    teamId,
  });

  useEffect(() => {
    const currentUserId = session.data?.user.id;
    if (!currentUserId) {
      return;
    }

    const scopeId = teamId ?? currentUserId;
    if (!scopeId) {
      return;
    }

    const wsUrl = getGameResultsWsUrl();

    let ws: WebSocket | null = null;
    let shouldReconnect = true;
    let reconnectAttempt = 0;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const hasActiveSession = async () => {
      try {
        const latestSession = await authClient.getSession();
        if (!shouldReconnect) {
          return false;
        }

        if (latestSession.data?.user.id === currentUserId) {
          return true;
        }

        const status = latestSession.error?.status;
        if (status !== undefined && status !== 401 && status !== 403) {
          return true;
        }
      } catch {
        return true;
      }

      shouldReconnect = false;
      session.refetch();
      return false;
    };

    const scheduleReconnect = () => {
      if (!shouldReconnect) {
        return;
      }

      reconnectAttempt += 1;
      const delay = Math.min(1000 * 2 ** Math.min(reconnectAttempt, 4), 10000);

      clearReconnectTimer();
      reconnectTimerRef.current = window.setTimeout(() => {
        connect();
      }, delay);
    };

    const connect = () => {
      if (!shouldReconnect) {
        return;
      }

      let opened = false;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        opened = true;
        reconnectAttempt = 0;
      };

      ws.onmessage = event => {
        let payload: GameResultsEvent | null = null;

        try {
          payload = JSON.parse(String(event.data)) as GameResultsEvent;
        } catch {
          return;
        }

        const relevant =
          payload?.type === 'game_results.connected' ||
          (payload?.type === 'game_results.changed' &&
            (teamId
              ? payload.scope?.teamId === teamId
              : payload.scope?.userId === currentUserId)) ||
          (payload?.type === 'game_result.upserted' &&
            (teamId
              ? payload.meta?.teamIds?.includes(teamId)
              : payload.data?.userId === currentUserId));
        if (!relevant) return;
        // Refetch through the account/team API so both Query and Dexie receive
        // updates to existing rows (for example the final BO3 match outcome).
        void queryClient.invalidateQueries({ queryKey: ['game-results', scopeId] });
        if (teamId) void queryClient.invalidateQueries({ queryKey: ['team-deck-map', teamId] });
      };

      ws.onclose = async event => {
        ws = null;

        if (authCloseCodes.has(event.code)) {
          shouldReconnect = false;
          session.refetch();
          return;
        }

        if (!opened && !(await hasActiveSession())) {
          return;
        }

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

      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close(1000, 'Component unmounted');
      }
    };
  }, [queryClient, session.data?.user.id, teamId]);

  return (
    <GameResultsContext.Provider value={gameResultData}>{children}</GameResultsContext.Provider>
  );
};

export const useGameResultsContext = (): StatisticsHistoryData | undefined => {
  return useContext(GameResultsContext);
};
