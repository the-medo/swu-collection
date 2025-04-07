import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { TournamentMatch } from '../../../../server/db/schema/tournament_match.ts';

export interface TournamentMatchesResponse {
  data: TournamentMatch[];
}

export const useGetTournamentMatches = (tournamentId: string | undefined) => {
  return useQuery<TournamentMatchesResponse>({
    queryKey: ['tournament-matches', tournamentId],
    queryFn: tournamentId
      ? async () => {
          const response = await api.tournament[':id']['matches'].$get({
            param: {
              id: tournamentId,
            },
          });
          if (!response.ok) {
            throw new Error('Something went wrong');
          }
          return response.json();
        }
      : skipToken,
    staleTime: Infinity,
  });
};
