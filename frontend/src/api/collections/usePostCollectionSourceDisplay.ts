import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';

export type UpdateDisplayOnSourceVariables = {
  collectionId: string; // path id
  id: number; // mapping row id
  displayOnSource: boolean;
};

export function usePostCollectionSourceDisplay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: UpdateDisplayOnSourceVariables) => {
      const { collectionId, id, displayOnSource } = vars;
      const response = await api.collection[':id'].source.display.$post({
        param: { id: collectionId },
        json: { id, displayOnSource },
      });
      if (!response.ok) {
        throw new Error('Failed to update displayOnSource');
      }
      const data = (await response.json()) as { data: any };
      return data;
    },
    onSuccess: (_data, vars) => {
      toast({ title: 'Updated display status' });
      // Invalidate related queries for this collection sources
      queryClient.invalidateQueries({ queryKey: ['collection', vars.collectionId, 'sources'] });
    },
  });
}
