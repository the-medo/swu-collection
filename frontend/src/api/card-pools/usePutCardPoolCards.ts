import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';

export interface PutCardPoolCardsBody {
  cards: string[];
}

export interface PutCardPoolCardsResponse {
  data: { id: string; replaced: number; leaders: string[] };
}

export const usePutCardPoolCards = (id: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation<PutCardPoolCardsResponse, Error, PutCardPoolCardsBody>({
    mutationFn: async body => {
      if (!id) throw new Error('Card pool id is required');
      const res = await api['card-pools'][':id'].cards.$put({
        param: { id },
        json: body,
      });
      if (!res.ok) {
        // propagate server error message if any
        let msg = 'Failed to replace card pool cards';
        try {
          const err = await res.json();
          if ('message' in err) msg = err.message;
        } catch {}
        throw new Error(msg);
      }
      return (await res.json()) as PutCardPoolCardsResponse;
    },
    onSuccess: () => {
      // Invalidate cards mapping and the pool detail
      void queryClient.invalidateQueries({ queryKey: ['card-pool-cards', id] });
      void queryClient.invalidateQueries({ queryKey: ['card-pool', id] });
    },
  });
};
