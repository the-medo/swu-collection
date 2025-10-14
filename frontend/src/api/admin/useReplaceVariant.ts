import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';

export interface ReplaceVariantBody {
  cardId: string;
  oldVariantId: string;
  newVariantId: string;
}

export interface ReplaceVariantResponse {
  message: string;
  data: {
    ccUpdated: number;
    cvpUpdated: number;
    cvphUpdated: number;
  };
}

/**
 * Admin-only: Replace all occurrences of an old variant ID with a new variant ID for a given card.
 * Validates the target variant exists in the current card list on the server.
 */
export const useReplaceVariant = () => {
  const queryClient = useQueryClient();

  return useMutation<ReplaceVariantResponse, ErrorWithStatus, ReplaceVariantBody>({
    mutationFn: async (payload: ReplaceVariantBody) => {
      const response = await api.admin['variant-checker']['replace-variant'].$post({
        json: payload,
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
        const message = 'Failed to replace variant';
        const error: ErrorWithStatus = new Error(message);
        error.status = response.status as any;
        throw error;
      }

      const data = (await response.json()) as ReplaceVariantResponse;
      return data;
    },
    onSuccess: () => {
      // Refresh the deleted variants map so UI reflects the change
      queryClient.invalidateQueries({ queryKey: ['admin', 'variant-checker', 'check-deleted-variants'] });
      // Potentially collections/prices views could be invalidated in the future if needed.
    },
  });
};
