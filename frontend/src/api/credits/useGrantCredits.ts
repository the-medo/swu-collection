import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { createApiError } from '@/api/errors';
import { battlefieldKeys } from '@/api/battlefield/useBattlefield';
import { patreonKeys } from '@/api/patreon/queryKeys';
import { creditKeys } from './queryKeys';
import type { CreditGrantInput } from '../../../../shared/types/credits';

export function useGrantCredits() {
  const client = useQueryClient();
  const refresh = async (userId: string) => {
    await Promise.all([
      client.invalidateQueries({ queryKey: creditKeys.all }),
      client.invalidateQueries({ queryKey: battlefieldKeys.editor(userId) }),
      client.invalidateQueries({ queryKey: patreonKeys.all }),
    ]);
  };
  return useMutation({
    mutationFn: async ({ userId, input }: { userId: string; input: CreditGrantInput }) => {
      const response = await api.admin.credits[':userId'].grants.$post(
        { param: { userId }, json: input },
        { headers: { 'X-Requested-With': 'swubase' } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not grant credits.');
      return (await response.json()).data;
    },
    onSuccess: result => refresh(result.userId),
    // A response can be lost after the server commits. Refresh before another attempt.
    onError: (_error, variables) => refresh(variables.userId),
  });
}
