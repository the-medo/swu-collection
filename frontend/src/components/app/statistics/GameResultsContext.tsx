import * as React from 'react';
import { createContext, useContext } from 'react';
import {
  StatisticsHistoryData,
  useGameResults,
} from '@/components/app/statistics/useGameResults.ts';

const GameResultsContext = createContext<StatisticsHistoryData | undefined>(undefined);

interface GameResultsProviderProps {
  teamId?: string;
  children: React.ReactNode;
}

export const GameResultsProvider: React.FC<GameResultsProviderProps> = ({ teamId, children }) => {
  const gameResultData = useGameResults({ teamId });

  return (
    <GameResultsContext.Provider value={gameResultData}>{children}</GameResultsContext.Provider>
  );
};

export const useGameResultsContext = (): StatisticsHistoryData | undefined => {
  return useContext(GameResultsContext);
};
