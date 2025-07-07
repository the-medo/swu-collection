import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';

/**
 * Parameters for computing matchup card statistics
 */
export interface MatchupCardStatsParams {
  metaId?: number;
  tournamentId?: string;
  tournamentGroupId?: string;
  leaderId?: string;
  baseId?: string;
  leaderId2?: string;
  baseId2?: string;
}

/**
 * Response from the matchup card statistics API
 */
export interface MatchupCardStatsResponse {
  data: any;
}

/**
 * Hook for computing matchup card statistics
 * @returns Mutation for computing matchup card statistics
 */
export const useMatchupCardStats = () => {
  const queryClient = useQueryClient();

  return useMutation<MatchupCardStatsResponse, ErrorWithStatus, MatchupCardStatsParams>({
    mutationFn: async (params: MatchupCardStatsParams) => {
      // Build query parameters
      const queryParams: Record<string, string> = {};

      if (params.metaId !== undefined) {
        queryParams.meta_id = params.metaId.toString();
      }

      if (params.tournamentId !== undefined) {
        queryParams.tournament_id = params.tournamentId;
      }

      if (params.tournamentGroupId !== undefined) {
        queryParams.tournament_group_id = params.tournamentGroupId;
      }

      if (params.leaderId !== undefined) {
        queryParams.leaderId = params.leaderId;
      }

      if (params.baseId !== undefined) {
        queryParams.baseId = params.baseId;
      }

      if (params.leaderId2 !== undefined) {
        queryParams.leaderId2 = params.leaderId2;
      }

      if (params.baseId2 !== undefined) {
        queryParams.baseId2 = params.baseId2;
      }

      // Make the API request
      const response = await api['card-stats']['matchup-stats'].$get({
        query: queryParams,
      });

      if (!response.ok) {
        if (response.status === 401) {
          const error: ErrorWithStatus = new Error('Unauthorized');
          error.status = 401;
          throw error;
        }

        if (response.status === 403) {
          const error: ErrorWithStatus = new Error('Forbidden');
          error.status = 403;
          throw error;
        }

        throw new Error('Something went wrong');
      }

      const data = await response.json();
      return data as MatchupCardStatsResponse;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries to refetch the data
      if (variables.metaId !== undefined) {
        queryClient.invalidateQueries({ queryKey: ['matchup-card-stats', variables.metaId] });
      }

      if (variables.tournamentId !== undefined) {
        queryClient.invalidateQueries({
          queryKey: ['matchup-card-stats', undefined, variables.tournamentId],
        });
      }

      if (variables.tournamentGroupId !== undefined) {
        queryClient.invalidateQueries({
          queryKey: ['matchup-card-stats', undefined, undefined, variables.tournamentGroupId],
        });
      }
    },
  });
};
