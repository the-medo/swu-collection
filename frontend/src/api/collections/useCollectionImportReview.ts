import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { useUser } from '@/hooks/useUser.ts';
import type { CollectionImportReview } from '../../../../types/CollectionImport.ts';
import { cardInListsQueryKeys } from './cardInListsQueryKeys.ts';

export const collectionImportKeys = {
  list: (userId: string | undefined, collectionId: string | undefined) =>
    ['collection-imports', userId, collectionId] as const,
  detail: (userId: string | undefined, collectionId: string, importId: string) =>
    ['collection-imports', userId, collectionId, importId] as const,
};

export function useCollectionImports(collectionId?: string, page = 0) {
  const user = useUser();
  return useQuery({
    queryKey: [...collectionImportKeys.list(user?.id, collectionId), 'page', page],
    queryFn:
      user && collectionId
        ? async () => {
            const response = await api.collection[':id'].imports.$get({
              param: { id: collectionId },
              query: { page: String(page) },
            });
            if (!response.ok) throw await createApiError(response, 'Failed to load imports');
            return await response.json();
          }
        : skipToken,
    staleTime: 30000,
  });
}

export function useCollectionImportReview(collectionId: string, importId: string) {
  const user = useUser();
  return useQuery({
    queryKey: collectionImportKeys.detail(user?.id, collectionId, importId),
    queryFn: user
      ? async () => {
          const response = await api.collection[':id'].imports[':importId'].$get({
            param: { id: collectionId, importId },
          });
          if (!response.ok) throw await createApiError(response, 'Failed to load import');
          return (await response.json()).data;
        }
      : skipToken,
    staleTime: 0,
  });
}

export function useCompleteCollectionImportRow(collectionId: string, importId: string) {
  const user = useUser();
  const queryClient = useQueryClient();
  const queryKey = collectionImportKeys.detail(user?.id, collectionId, importId);
  return useMutation({
    mutationFn: async ({ rowId, completed }: { rowId: string; completed: boolean }) => {
      const response = await api.collection[':id'].imports[':importId'].rows[':rowId'].$patch({
        param: { id: collectionId, importId, rowId },
        json: { completed },
      });
      if (!response.ok) throw await createApiError(response, 'Failed to update row');
      return (await response.json()).data;
    },
    onSuccess: result => {
      const changed = new Map(result.rows.map(row => [row.id, row]));
      queryClient.setQueryData<CollectionImportReview>(queryKey, previous =>
        previous
          ? {
              ...previous,
              rows: previous.rows.map(row => {
                const updated = changed.get(row.id);
                return updated ? { ...row, ...updated } : row;
              }),
            }
          : previous,
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: collectionImportKeys.list(user?.id, collectionId),
      });
    },
  });
}

export function useResolveCollectionImportDuplicate(collectionId: string, importId: string) {
  const user = useUser();
  const queryClient = useQueryClient();
  const queryKey = collectionImportKeys.detail(user?.id, collectionId, importId);
  return useMutation({
    mutationFn: async ({ rowId, count }: { rowId: string; count: number }) => {
      const response = await api.collection[':id'].imports[':importId'].rows[':rowId'][
        'resolve-duplicate'
      ].$post({
        param: { id: collectionId, importId, rowId },
        json: { count },
      });
      if (!response.ok) throw await createApiError(response, 'Failed to save the final count');
      return (await response.json()).data;
    },
    onSuccess: result => {
      const changed = new Map(result.rows.map(row => [row.id, row]));
      queryClient.setQueryData<CollectionImportReview>(queryKey, previous =>
        previous
          ? {
              ...previous,
              rows: previous.rows.map(row => ({ ...row, ...changed.get(row.id) })),
            }
          : previous,
      );
    },
    onSettled: () => {
      for (const key of [
        collectionImportKeys.list(user?.id, collectionId),
        ['collection', collectionId],
        ['collection-content', collectionId],
        ['collections', user?.id],
        ['user-collections-sync'],
        cardInListsQueryKeys.all,
      ]) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}
