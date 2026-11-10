import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { createApiError } from '@/api/errors.ts';
import { useUser } from '@/hooks/useUser.ts';
import { cardInListsQueryKeys } from './cardInListsQueryKeys.ts';
import type { CollectionCsvImportRequest } from '../../../../types/CollectionImport.ts';
import { collectionImportKeys } from './useCollectionImportReview.ts';

export const useCollectionImport = () => {
  const queryClient = useQueryClient();
  const user = useUser();
  return useMutation({
    mutationFn: async (input: CollectionCsvImportRequest) => {
      const response = await api.collection.import.$post({ json: input });
      if (!response.ok) throw await createApiError(response, 'Failed to import CSV');
      return (await response.json()).data;
    },
    onSuccess: report => {
      for (const queryKey of [
        ['collection', report.collectionId],
        ['collection-content', report.collectionId],
        ['collections', user?.id],
        ['user-collections-sync'],
        cardInListsQueryKeys.all,
        collectionImportKeys.list(user?.id, report.collectionId),
      ])
        void queryClient.invalidateQueries({ queryKey });
    },
  });
};
