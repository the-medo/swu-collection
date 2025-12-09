import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { CardPool } from '../../../../server/db/schema/card_pool.ts';

export interface UpdateCardPoolBody {
  name?: string;
  description?: string;
  visibility?: 'private' | 'unlisted' | 'public';
}

export const useUpdateCardPool = (id: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: UpdateCardPoolBody) => {
      if (!id) throw new Error('Card pool id is required');
      const res = await api['card-pools'][':id'].$patch({
        param: { id },
        json: body,
      });
      if (!res.ok) {
        throw new Error('Failed to update card pool');
      }
      return (await res.json()) as { data: CardPool };
    },
    onSuccess: result => {
      queryClient.setQueryData(['card-pool', id], result);
      void queryClient.invalidateQueries({ queryKey: ['card-pools'], exact: false });
    },
  });
};
