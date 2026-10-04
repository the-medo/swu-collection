import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { createApiError } from '@/api/errors';
import { userReportKeys } from './queryKeys';
import type { ModerationActionInput } from '../../../../shared/types/userReportModeration';
export function useModerateReport(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: ModerationActionInput) => {
      const response = await api.admin['user-reports'][':reportId'].actions.$post(
        { param: { reportId: id }, json: input },
        { headers: { 'X-Requested-With': 'swubase' } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not save this decision.');
      return (await response.json()).data;
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: userReportKeys.all }),
        client.invalidateQueries({ queryKey: ['user'] }),
      ]);
    },
  });
}
