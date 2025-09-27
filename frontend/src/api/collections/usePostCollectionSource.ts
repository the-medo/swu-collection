import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { CollectionSourceMapping } from './useGetCollectionSources.ts';

export type PostCollectionSourceVariables = {
  collectionId: string; // path :id
  sourceCollectionId: string; // body
  displayOnSource?: boolean; // optional body flag
};

export function usePostCollectionSource() {
  const queryClient = useQueryClient();
  return useMutation<CollectionSourceMapping, Error, PostCollectionSourceVariables>({
    mutationFn: async (vars: PostCollectionSourceVariables) => {
      const { collectionId, sourceCollectionId, displayOnSource } = vars;
      const response = await api.collection[':id'].source.$post({
        param: { id: collectionId },
        json: {
          sourceCollectionId,
          ...(displayOnSource !== undefined ? { displayOnSource } : {}),
        },
      });
      if (!response.ok) {
        const err = new Error('Failed to add source collection mapping');
        // We intentionally do not attach status type here to avoid importing shared type
        // Callers can inspect network error separately if needed
        throw err;
      }
      const data = (await response.json()) as CollectionSourceMapping;
      return data;
    },
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({
        queryKey: ['collection', vars.sourceCollectionId, 'sources'],
        exact: false,
      });
    },
  });
}
