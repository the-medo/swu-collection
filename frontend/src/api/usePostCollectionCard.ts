import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { CardLanguage } from '../../../types/enums.ts';

// Define the shape of the card data you're sending to the POST endpoint.
export type CardUpdateData = {
  cardId: string;
  variantId: string;
  foil: boolean;
  condition: number;
  language: CardLanguage;
  amount: number;
  note?: string;
  amount2?: number | null;
  price?: string | null;
};

export const usePostCollectionCard = (collectionId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    // The mutation function posts the card to the collection.
    mutationFn: async (cardData: CardUpdateData) => {
      if (!collectionId) {
        throw new Error('Collection id is required');
      }

      const response = await api.collection[':id'].card.$post({
        param: { id: collectionId },
        json: cardData,
      });

      if (!response.ok) {
        throw new Error('Something went wrong while adding the card');
      }

      // The endpoint returns a JSON object, e.g. { data: newCard }
      return response.json();
    },
    // On success, update the cache for the GET query.
    onSuccess: result => {
      // result should be something like { data: newCard }
      queryClient.setQueryData(['collection-content', collectionId], oldData => {
        // If there's no data cached yet, initialize with the new card.
        if (!oldData) {
          return { data: [result.data] };
        }

        // Update the existing list by appending the new card.
        // Depending on your use case, you might need to merge or update existing items instead.
        return {
          ...oldData,
          data: [...oldData.data, result.data],
        };
      });
    },
    // Optionally, you can add onError or onSettled handlers here.
  });
};
