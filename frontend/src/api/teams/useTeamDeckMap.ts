import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';

export const useTeamDeckMap = (teamId: string | undefined) => {
  return useQuery({
    queryKey: ['team-deck-map', teamId],
    queryFn: teamId
      ? async () => {
          const response = await api.teams[':id']['deck-map'].$get({
            param: { id: teamId },
          });
          if (!response.ok) {
            throw new Error('Failed to fetch team deck map');
          }
          const { data } = await response.json();
          return data;
        }
      : skipToken,
  });
};
