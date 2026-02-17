import { useTeamDeckMap, useTeamMembers } from '@/api/teams';
import { useMemo } from 'react';

export type TeamDataMap = { members: Record<string, true>; decks: Record<string, string> };

const emptyTeamDataMap: TeamDataMap = {
  members: {},
  decks: {},
};

export const useTeamDataMap = (teamId: string | undefined): TeamDataMap => {
  const { data: members, isLoading: membersLoading } = useTeamMembers(teamId);
  const { data: decks, isLoading: decksLoading } = useTeamDeckMap(teamId);

  return useMemo(() => {
    if (membersLoading || decksLoading || !decks || !members) return emptyTeamDataMap;

    const teamDataMap: TeamDataMap = {
      members: {},
      decks: {},
    };

    teamDataMap.members = members.reduce(
      (map, member) => {
        map[member.userId] = true;
        return map;
      },
      {} as TeamDataMap['members'],
    );

    teamDataMap.decks = decks.reduce(
      (map, deck) => {
        map[deck.deckId] = deck.addedAt;
        return map;
      },
      {} as TeamDataMap['decks'],
    );

    return teamDataMap;
  }, [membersLoading, members]);
};
