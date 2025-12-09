import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';

export const useDeleteCardPool = (id: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Card pool id is required');
      const res = await api['card-pools'][':id'].$delete({ param: { id } });
      if (!res.ok && res.status !== 204) {
        throw new Error('Failed to delete card pool');
      }
      return true;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['card-pools'], exact: false });
    },
  });
};
