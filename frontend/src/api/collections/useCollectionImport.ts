import { useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface ImportCard {
  cardId: string;
  variantId: string;
  count: number;
  isFoil: boolean;
}

interface ImportCardsRequest {
  cards: ImportCard[];
}

interface ImportCardsResponse {
  data: {
    inserted: number;
    cards: any[];
  };
}

export const useCollectionImport = (
  collectionId: string | undefined,
): UseMutationResult<ImportCardsResponse, Error, ImportCardsRequest> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ImportCardsRequest) => {
      if (!collectionId) {
        throw new Error('Collection ID is required');
      }

      const response = await api.collection[':id'].import.$post({
        param: { id: collectionId },
        json: data,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import cards');
      }

      return response.json();
    },
    onSuccess: data => {
      // Invalidate queries to refresh the collection data
      queryClient.invalidateQueries({ queryKey: ['collection', collectionId] });
      queryClient.invalidateQueries({ queryKey: ['collection-content', collectionId] });

      toast({
        title: 'Import successful! Reloading page.',
        description: `Successfully imported ${data.data.inserted} cards to your collection.`,
      });

      /** Reload 1s after success to refresh store */
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
    onError: error => {
      toast({
        title: 'Import failed',
        description: error.message || 'Failed to import cards to your collection.',
        variant: 'destructive',
      });
    },
  });
};
