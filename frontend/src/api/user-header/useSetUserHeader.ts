import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import type { UserHeaderInput } from '../../../../types/UserHeader.ts';
import { userHeaderKeys } from './queryKeys.ts';

export function useSetUserHeader(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UserHeaderInput) => {
      const response = await api.user.header.$post(
        { json: input },
        { headers: { 'X-Requested-With': 'swubase' } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not save your header.');
      return (await response.json()).data;
    },
    onSuccess: async data => {
      await queryClient.cancelQueries({ queryKey: userHeaderKeys.all(userId) });
      queryClient.setQueryData(userHeaderKeys.view(userId), data);
      await queryClient.invalidateQueries({ queryKey: userHeaderKeys.settings(userId) });
    },
  });
}
