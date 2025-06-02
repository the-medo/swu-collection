import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { TournamentGroupResponse } from '../../../../types/TournamentGroup.ts';

export const useGetTournamentGroup = (id: string) => {
  return useQuery({
    queryKey: ['tournament-group', id],
    queryFn: async () => {
      const response = await api['tournament-groups'][':id'].$get({
        param: { id },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tournament group');
      }

      return await response.json() as TournamentGroupResponse;
    },
    staleTime: Infinity,
    enabled: !!id,
  });
};