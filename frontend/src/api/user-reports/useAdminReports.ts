import { useQuery } from '@tanstack/react-query';
import { useRole } from '@/hooks/useRole';
import { useUser } from '@/hooks/useUser';
import { api } from '@/lib/api';
import { createApiError } from '@/api/errors';
import { userReportKeys } from './queryKeys';
import type { ReportListInput, ReportPage } from '../../../../shared/types/userReportModeration';
export function useAdminReports(input: ReportListInput) {
  const actor = useUser();
  const isAdmin = useRole()('admin');
  return useQuery({
    queryKey: userReportKeys.list(actor?.id, input),
    enabled: isAdmin,
    staleTime: 0,
    gcTime: 0,
    queryFn: async (): Promise<ReportPage> => {
      const response = await api.admin['user-reports'].$get({
        query: { ...input, page: String(input.page) },
      });
      if (!response.ok) throw await createApiError(response, 'Could not load reports.');
      return (await response.json()).data;
    },
  });
}
