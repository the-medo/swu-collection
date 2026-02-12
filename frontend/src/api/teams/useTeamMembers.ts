import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';

export const useTeamMembers = (teamId: string | undefined) => {
  return useQuery({
    queryKey: ['team-members', teamId],
    queryFn: teamId
      ? async () => {
          const response = await api.teams[':id'].members.$get({
            param: { id: teamId },
          });
          if (!response.ok) {
            throw new Error('Failed to fetch team members');
          }
          const { data } = await response.json();
          return data;
        }
      : skipToken,
  });
};
