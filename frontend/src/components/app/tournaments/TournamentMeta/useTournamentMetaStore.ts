import { Store, useStore } from '@tanstack/react-store';
import {
  TournamentAnalyzerData,
  TournamentDataMap,
  TournamentDeckKey,
  TournamentInfoMap,
} from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { useMemo } from 'react';
import { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';
import { TournamentMatch } from '../../../../../../server/db/schema/tournament_match.ts';

interface TournamentMetaStore {
  tournamentIds: string[];
  tournamentData: TournamentDataMap;
  selectedDeckKey: TournamentDeckKey;
}

const defaultState: TournamentMetaStore = {
  tournamentIds: [],
  tournamentData: {},
  selectedDeckKey: {},
};

const store = new Store<TournamentMetaStore>(defaultState);

const setTournamentIds = (tournamentIds: string[]) => {
  store.setState(state => ({
    ...state,
    tournamentIds,
  }));
};

const setTournamentData = (tournamentId: string, data: TournamentAnalyzerData) => {
  store.setState(state => ({
    ...state,
    tournamentData: { ...state.tournamentData, [tournamentId]: data },
  }));
};

const setTournamentDeckKey = (data: TournamentDeckKey) => {
  store.setState(state => ({
    ...state,
    selectedDeckKey: data,
  }));
};

export function useTournamentMetaStore() {
  const tournamentIds = useStore(store, state => state.tournamentIds);
  const tournamentData = useStore(store, state => state.tournamentData);

  const { isLoaded, matches, decks, tournaments } = useMemo(() => {
    let isLoaded = true;
    const matches: TournamentMatch[][] = [];
    const decks: TournamentDeckResponse[][] = [];
    const tournaments: TournamentInfoMap = {};

    tournamentIds.forEach(tid => {
      if (tournamentData[tid] === undefined) {
        isLoaded = false;
      } else {
        decks.push(tournamentData[tid].decks);
        matches.push(tournamentData[tid].matches);
        tournaments[tid] = tournamentData[tid].info[tid];
      }
    });

    return {
      isLoaded,
      matches: matches.flat(),
      decks: decks.flat(),
      tournaments,
    };
  }, [tournamentIds, tournamentData]);

  return { tournamentIds, isLoaded, matches, decks, tournaments };
}

export function useSelectedDeckKey() {
  return useStore(store, state => state.selectedDeckKey);
}

export function useTournamentMetaActions() {
  return {
    setTournamentIds,
    setTournamentData,
    setTournamentDeckKey,
  };
}
