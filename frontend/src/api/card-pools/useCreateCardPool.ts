import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { CardPoolCreate } from '../../../../server/routes/card-pools/post.ts';

export type CreateCardPoolRequest = CardPoolCreate;

export const useCreateCardPool = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateCardPoolRequest) => {
      const res = await api['card-pools'].$post({ json: body });
      if (!res.ok) {
        throw new Error('Failed to create card pool');
      }
      return (await res.json()) as { data: any };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['card-pools'], exact: false });
    },
  });
};
