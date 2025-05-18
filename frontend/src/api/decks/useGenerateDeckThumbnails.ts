import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { type ZGenerateThumbnailsParams } from '../../../../types/ZGenerateThumbnailsParams.ts';

export interface DeckThumbnailsResult {
  success: number;
  errors: number;
  thumbnails: { leaderBaseKey: string; thumbnailUrl: string }[];
  errorDetails: { leaderBaseKey: string; error: string }[];
}

/**
 * Hook to generate thumbnails for all decks.
 * This is an admin-only operation.
 */
export const useGenerateDeckThumbnails = () => {
  return useMutation<DeckThumbnailsResult, Error, { force?: boolean }>({
    mutationFn: async (payload: ZGenerateThumbnailsParams) => {
      const { force } = payload;
      const response = await api.deck.thumbnails.$post({
        query: { force },
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    },
    onError: error => {
      toast({
        variant: 'destructive',
        title: 'Error while generating thumbnails',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    },
  });
};
