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
import { TeamMember } from '../../../../../server/db/schema/team_member.ts';
import type { TeamDeckShortened } from '../../../../../server/routes/teams/_id/deck-map/get.ts';

const GameResultsContext = createContext<StatisticsHistoryData | undefined>(undefined);
const authCloseCodes = new Set([4401, 4403]);

interface GameResultsProviderProps {
  teamId?: string;
  children: React.ReactNode;
}

interface GameResultUpsertedEvent {
  type?: string;
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
        let payload: GameResultUpsertedEvent | null = null;

        try {
          payload = JSON.parse(String(event.data)) as GameResultUpsertedEvent;
        } catch {
          return;
        }

        if (payload?.type !== 'game_result.upserted') {
          return;
        }

        const eventUserId = payload.data?.userId;
        const eventTeamIds = payload.meta?.teamIds ?? [];

        const isRelevant = teamId ? eventTeamIds.includes(teamId) : eventUserId === currentUserId;

        if (!isRelevant) {
          return;
        }

        let shouldAddGame: boolean | undefined = true;

        if (teamId) {
          shouldAddGame = undefined;
          const members = (queryClient.getQueryData(['team-members', teamId]) ??
            []) as unknown as TeamMember[];
          const deckOwner = members.find(member => member.userId === payload.data?.userId);
          console.log({ deckOwner, autoAddDeck: deckOwner?.autoAddDeck });
          if (deckOwner?.autoAddDeck) {
            shouldAddGame = true;
            queryClient.setQueryData(['team-deck-map', teamId], (oldData: TeamDeckShortened[]) => {
              if (oldData.find(td => td.deckId === payload.data?.deckId)) {
                console.log('Deck already in team-deck-map');
                return oldData;
              }
              console.log('Adding deck to team-deck-map');
              return [
                ...oldData,
                {
                  deckId: payload.data?.deckId,
                  addedAt: new Date().toISOString(),
                },
              ];
            });
          } else {
            //if owner doesnt have "autoAddDeck", we need to check if it exists already
            const teamDeckMap = queryClient.getQueryData([
              'team-deck-map',
              teamId,
            ]) as TeamDeckShortened[];
            if (teamDeckMap.find(td => td.deckId === payload.data?.deckId)) {
              shouldAddGame = true;
              console.log('Deck already in team-deck-map');
            } else {
              console.log('Deck not in team-deck-map, adding');
            }
          }
          console.log({ deckOwner });
          // if (payload.data?.userId)
        }

        if (shouldAddGame) {
          const publicQueries = queryClient.getQueriesData({
            queryKey: ['game-results', scopeId] as any,
          });
          publicQueries.forEach(([qk, _qd]: any) => {
            const gameDate = payload.data?.createdAt;
            if (
              gameDate &&
              (qk[2] === undefined || qk[3] === undefined || (qk[3] > gameDate && gameDate > qk[2]))
            ) {
              console.log('adding game to this QK:', qk);
              queryClient.setQueryData(qk, (oldData: GameResult[]) => {
                if (oldData.find(td => td.id === payload.data?.id)) {
                  console.log('Game already in query data, skipping');
                  return oldData;
                }
                console.log('Adding game to query data');
                return [...oldData, payload.data];
              });
            }
          });
        }
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
