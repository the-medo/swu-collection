import { useCardList } from '@/api/lists/useCardList.ts';
import { ProcessedTournamentGroup } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/hooks/useProcessedTournamentGroups.ts';
import { useMemo } from 'react';
import {
  addToMetaPartObject,
  emptyMetaPartObject,
  MetaShareSnapshot,
  SortedWeeks,
  WeekMap,
} from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/WeekToWeek/weekToWeekLib.ts';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { getDeckKey2 } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';

export interface WeekToWeekData {
  sortedWeeks: SortedWeeks;
  weekMap: WeekMap;
  weekToDeckKey: MetaShareSnapshot;
  deckKeyToWeek: MetaShareSnapshot;
}

export function useWeekToWeekData(
  processedTournamentGroups: ProcessedTournamentGroup[],
  metaInfo: MetaInfo,
): WeekToWeekData {
  const { data: cardListData } = useCardList();

  return useMemo(() => {
    const sortedGroups = [...processedTournamentGroups]
      .filter(group => !group.isUpcoming)
      .sort((a, b) => a.weekNumber - b.weekNumber);

    const sortedWeeks: SortedWeeks = sortedGroups.map(group => group.group.id);

    const weekMap: WeekMap = {};
    sortedGroups.forEach(group => {
      weekMap[group.group.id] = group;
    });

    const weekToDeckKey: MetaShareSnapshot = {};
    const deckKeyToWeek: MetaShareSnapshot = {};

    sortedWeeks.forEach(weekId => {
      weekMap[weekId]?.leaderBase?.forEach(leaderBase => {
        const key = getDeckKey2(
          leaderBase.leaderCardId,
          leaderBase.baseCardId,
          metaInfo,
          cardListData,
        );
        if (!weekToDeckKey[weekId]) {
          weekToDeckKey[weekId] = {};
        }
        if (!deckKeyToWeek[key]) {
          deckKeyToWeek[key] = {};
        }
        if (!weekToDeckKey[weekId][key]) weekToDeckKey[weekId][key] = { ...emptyMetaPartObject };
        if (!deckKeyToWeek[key][weekId]) deckKeyToWeek[key][weekId] = { ...emptyMetaPartObject };
        addToMetaPartObject(weekToDeckKey[weekId][key], leaderBase);
        addToMetaPartObject(deckKeyToWeek[key][weekId], leaderBase);
      });
    });

    return { sortedWeeks, weekMap, weekToDeckKey, deckKeyToWeek };
  }, [processedTournamentGroups, metaInfo, cardListData]);
}
