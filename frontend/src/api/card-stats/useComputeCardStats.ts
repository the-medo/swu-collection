import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';

/**
 * Parameters for computing card statistics
 */
export interface ComputeCardStatsParams {
  metaId?: number;
  tournamentId?: string;
}

/**
 * Response from the compute card statistics API
 */
export interface ComputeCardStatsResponse {
  message: string;
  data: {
    metaId?: number;
    tournamentId?: string;
    cardStatsCount: number;
    cardStatsLeaderCount: number;
    cardStatsLeaderBaseCount: number;
  };
}

/**
 * Hook for computing card statistics
 * @returns Mutation for computing card statistics
 */
export const useComputeCardStats = () => {
  const queryClient = useQueryClient();

  return useMutation<ComputeCardStatsResponse, ErrorWithStatus, ComputeCardStatsParams>({
    mutationFn: async (params: ComputeCardStatsParams) => {
      // Build query parameters
      const queryParams: Record<string, string> = {};
      
      if (params.metaId !== undefined) {
        queryParams.meta_id = params.metaId.toString();
      }
      
      if (params.tournamentId !== undefined) {
        queryParams.tournament_id = params.tournamentId;
      }
      
      // Make the API request
      const response = await api['card-stats'].compute.$post({
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
      return data as ComputeCardStatsResponse;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries to refetch the data
      if (variables.metaId !== undefined) {
        queryClient.invalidateQueries({ queryKey: ['card-stats', variables.metaId] });
      }
      
      if (variables.tournamentId !== undefined) {
        queryClient.invalidateQueries({ queryKey: ['card-stats', undefined, variables.tournamentId] });
      }
    },
  });
};