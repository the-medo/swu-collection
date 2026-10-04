import * as React from 'react';
import { createContext, useContext, useEffect } from 'react';
import {
  StatisticsHistoryData,
  useGameResults,
} from '@/components/app/statistics/useGameResults.ts';
import { useSearch } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth-client.ts';
import { useAppRealtime } from '@/components/app/realtime/context.ts';
import { GameResult } from '../../../../../server/db/schema/game_result.ts';
import type { GameResultsScope } from '../../../../../shared/types/game-results-realtime.ts';

const GameResultsContext = createContext<StatisticsHistoryData | undefined>(undefined);

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
  const realtime = useAppRealtime();

  const gameResultData = useGameResults({
    datetimeFrom: sDateRangeFrom,
    datetimeTo: sDateRangeTo,
    teamId,
  });

  useEffect(() => {
    const currentUserId = session.data?.user.id;
    if (!currentUserId || !realtime) return;
    const scopeId = teamId ?? currentUserId;
    const unlisten = realtime.listen(event => {
      const payload = event as GameResultsEvent;
      const relevant =
        payload.type === 'app.resync' ||
        payload.type === 'game_results.connected' ||
        (payload.type === 'game_results.changed' &&
          (teamId ? payload.scope?.teamId === teamId : payload.scope?.userId === currentUserId)) ||
        (payload.type === 'game_result.upserted' &&
          (teamId
            ? payload.meta?.teamIds?.includes(teamId)
            : payload.data?.userId === currentUserId));
      if (!relevant) return;
      // Refetch through the account/team API so Query and Dexie both receive updates.
      void queryClient.invalidateQueries({ queryKey: ['game-results', scopeId] });
      if (teamId) void queryClient.invalidateQueries({ queryKey: ['team-deck-map', teamId] });
    });
    const unsubscribe = realtime.subscribe({
      topic: 'game-results',
      ...(teamId ? { teamId } : {}),
    });
    return () => {
      unlisten();
      unsubscribe();
    };
  }, [queryClient, session.data?.user.id, teamId, realtime]);

  return (
    <GameResultsContext.Provider value={gameResultData}>{children}</GameResultsContext.Provider>
  );
};

export const useGameResultsContext = (): StatisticsHistoryData | undefined => {
  return useContext(GameResultsContext);
};
