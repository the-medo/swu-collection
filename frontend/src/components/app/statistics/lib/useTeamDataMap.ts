import { useTeamDeckMap, useTeamMembers } from '@/api/teams';
import { useMemo } from 'react';
import type { PublicProfileSummary } from '@/components/app/users/UserProfilePopover.tsx';

export type TeamDataMap = {
  members: Record<string, string>;
  profiles: Record<string, PublicProfileSummary>;
  decks: Record<string, string>;
};

const emptyTeamDataMap: TeamDataMap = {
  members: {},
  profiles: {},
  decks: {},
};

export const useTeamDataMap = (teamId: string | undefined): TeamDataMap => {
  const { data: members, isLoading: membersLoading } = useTeamMembers(teamId);
  const { data: decks, isLoading: decksLoading } = useTeamDeckMap(teamId);

  return useMemo(() => {
    if (membersLoading || decksLoading || !decks || !members) return emptyTeamDataMap;

    const teamDataMap: TeamDataMap = {
      members: {},
      profiles: {},
      decks: {},
    };

    teamDataMap.members = members.reduce(
      (map, member) => {
        map[member.userId] = member.name;
        return map;
      },
      {} as TeamDataMap['members'],
    );

    teamDataMap.profiles = Object.fromEntries(
      members.map(member => [
        member.userId,
        { id: member.userId, displayName: member.name, image: member.image },
      ]),
    );

    teamDataMap.decks = decks.reduce(
      (map, deck) => {
        map[deck.deckId] = deck.addedAt;
        return map;
      },
      {} as TeamDataMap['decks'],
    );

    return teamDataMap;
  }, [membersLoading, members, decks]);
};
