import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { useCollectionGroupStoreActions } from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';

export type ApplyCollectionOperation = 'add' | 'remove';

export type ApplyCollectionVariables = {
  collectionId: string; // destination collection (must be owned by user)
  collectionIdToApply: string; // public OTHER-type collection to apply
  operation?: ApplyCollectionOperation; // default 'add'
};

export type ApplyCollectionResult = {
  data?: {
    changed?: number;
    deleted?: number;
    amount?: number;
  };
};

export function useApplyCollection() {
  const queryClient = useQueryClient();
  const { forceRefreshCollectionGroupStore } = useCollectionGroupStoreActions();

  return useMutation<ApplyCollectionResult, Error, ApplyCollectionVariables>({
    mutationFn: async ({ collectionId, collectionIdToApply, operation = 'add' }) => {
      const response = await api.collection[':id'].apply.$post({
        param: { id: collectionId },
        json: { collectionIdToApply, operation },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}) as any);
        const message =
          (error && (error.message as string)) || 'Failed to apply collection changes';
        throw new Error(message);
      }

      const json = (await response.json()) as ApplyCollectionResult;
      return json;
    },
    onSuccess: async (result, variables) => {
      // Invalidate affected queries (same pattern as other collection mutations)
      queryClient.invalidateQueries({ queryKey: ['user-collections-sync'] });
      queryClient.invalidateQueries({ queryKey: ['collection', variables.collectionId] });
      queryClient.invalidateQueries({ queryKey: ['collection-content', variables.collectionId] });

      forceRefreshCollectionGroupStore();

      const data = result?.data;
      toast({
        title: 'Collection updated',
        description: data
          ? `Applied ${data.amount ?? 0} changes (${data.changed ?? 0} upserts, ${data.deleted ?? 0} deletions)`
          : 'Cards have been updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update collection',
        description: error.message,
      });
    },
  });
}
