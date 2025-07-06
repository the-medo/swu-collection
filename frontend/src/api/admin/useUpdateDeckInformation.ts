import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';

/**
 * Response from the update deck information API
 */
export interface UpdateDeckInformationResponse {
  message: string;
  data: {
    updatedCount: number;
  };
}

/**
 * Hook for updating deck information for all decks
 * @returns Mutation for updating deck information
 */
export const useUpdateDeckInformation = () => {
  const queryClient = useQueryClient();

  return useMutation<UpdateDeckInformationResponse, ErrorWithStatus>({
    mutationFn: async () => {
      // Make the API request
      const response = await api.admin['special-actions']['update-deck-information'].$post();
      
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
      return data as UpdateDeckInformationResponse;
    },
    onSuccess: () => {
      // Invalidate deck queries to refetch the data
      queryClient.invalidateQueries({ queryKey: ['decks'] });
    },
  });
};