import { useTeamMembers } from '@/api/teams';
import { useMemo } from 'react';

export type TeamMemberMap = Record<string, true>;

export const useTeamMemberMap = (teamId: string | undefined): TeamMemberMap => {
  const { data: members, isLoading: membersLoading } = useTeamMembers(teamId);

  return useMemo(() => {
    if (membersLoading || !members) return {};

    return members.reduce((map, member) => {
      map[member.userId] = true;
      return map;
    }, {} as TeamMemberMap);
  }, [membersLoading, members]);
};
