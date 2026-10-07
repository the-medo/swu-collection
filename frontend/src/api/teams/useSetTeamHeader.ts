import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import type { TeamHeaderInput } from '../../../../types/TeamHeader.ts';
import { teamHeaderKeys } from './headerQueryKeys.ts';

export function useSetTeamHeader(teamId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TeamHeaderInput) => {
      const response = await api.teams[':id'].header.$post(
        { param: { id: teamId }, json: input },
        { headers: { 'X-Requested-With': 'swubase' } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not save the team header.');
      return (await response.json()).data;
    },
    onSuccess: async data => {
      await queryClient.cancelQueries({ queryKey: teamHeaderKeys.all(teamId) });
      queryClient.setQueryData(teamHeaderKeys.view(teamId), data);
      await queryClient.invalidateQueries({ queryKey: ['team-header', teamId, 'settings'] });
    },
  });
}
