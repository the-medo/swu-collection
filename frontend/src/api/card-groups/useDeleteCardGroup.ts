import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { cardGroupKeys } from './queryKeys.ts';

export function useDeleteCardGroup() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.admin['card-groups'][':id'].$delete({ param: { id } });
      if (!response.ok) throw await createApiError(response, 'Could not delete this card group.');
    },
    onSuccess: () => client.invalidateQueries({ queryKey: cardGroupKeys.all }),
  });
}
