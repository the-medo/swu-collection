import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { createApiError } from '@/api/errors';
import { patreonKeys } from './queryKeys';

export function useReviewPatreonMember() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const response = await api.admin.patreon[':memberId'].review.$post(
        { param: { memberId } },
        { headers: { 'X-Requested-With': 'swubase' } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not approve this supporter.');
      return (await response.json()).data;
    },
    onSettled: () => client.invalidateQueries({ queryKey: patreonKeys.all }),
  });
}
