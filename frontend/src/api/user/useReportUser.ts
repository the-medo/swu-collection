import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import type { CreateUserReportInput } from '../../../../shared/types/userReports.ts';

export function useReportUser() {
  return useMutation({
    mutationFn: async (input: CreateUserReportInput) => {
      const response = await api['user-reports'].$post(
        { json: input },
        { headers: { 'X-Requested-With': 'swubase' } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not submit your report.');
      return (await response.json()).data;
    },
  });
}
