import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { cardGroupKeys } from './queryKeys.ts';
import type { CardGroupInput } from '../../../../types/CardGroup.ts';

export function useSaveCardGroup() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: CardGroupInput }) => {
      const resource = api.admin['card-groups'];
      const response = id
        ? await resource[':id'].$put({ param: { id }, json: input })
        : await resource.$post({ json: input });
      if (!response.ok) throw await createApiError(response, 'Could not save this card group.');
      return (await response.json()).data;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: cardGroupKeys.all }),
  });
}
