import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { TournamentGroupTournamentsResponse } from '../../../../types/TournamentGroup.ts';

export const useGetTournamentGroupTournaments = (groupId: string) => {
  return useQuery({
    queryKey: ['tournament-group-tournaments', groupId],
    queryFn: async () => {
      const response = await api['tournament-groups'][':id'].tournaments.$get({
        param: { id: groupId },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tournament group tournaments');
      }

      return await response.json() as TournamentGroupTournamentsResponse;
    },
    staleTime: Infinity,
    enabled: !!groupId,
  });
};