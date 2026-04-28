import { useQuery } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type { LiveTournamentBracketResponse } from '../../../../types/TournamentWeekend.ts';
import { tournamentWeekendQueryKeys } from './queryKeys';

export const useLiveTournamentBracket = (
  weekendId: string | undefined,
  tournamentId: string | undefined,
  enabled = true,
) => {
  return useQuery<LiveTournamentBracketResponse, ErrorWithStatus>({
    queryKey: tournamentWeekendQueryKeys.liveBracket(weekendId, tournamentId),
    queryFn: async () => {
      if (!weekendId || !tournamentId) {
        throw new Error('Weekend id and tournament id are required');
      }

      const response = await api['tournament-weekends'][':id'].tournament[
        ':tournamentId'
      ].bracket.$get({
        param: { id: weekendId, tournamentId },
      });

      if (!response.ok) {
        throw await createApiError(response, 'Failed to fetch live tournament bracket');
      }

      return response.json() as Promise<LiveTournamentBracketResponse>;
    },
    enabled: enabled && !!weekendId && !!tournamentId,
    staleTime: 30 * 1000,
  });
};
