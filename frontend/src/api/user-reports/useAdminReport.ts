import { useQuery } from '@tanstack/react-query';
import { useRole } from '@/hooks/useRole';
import { useUser } from '@/hooks/useUser';
import { api } from '@/lib/api';
import { createApiError } from '@/api/errors';
import { userReportKeys } from './queryKeys';
import type { ReportDetail } from '../../../../shared/types/userReportModeration';
export function useAdminReport(id: string) {
  const actor = useUser();
  const isAdmin = useRole()('admin');
  return useQuery({
    queryKey: userReportKeys.detail(actor?.id, id),
    enabled: isAdmin && !!id,
    staleTime: 0,
    gcTime: 0,
    queryFn: async (): Promise<ReportDetail> => {
      const response = await api.admin['user-reports'][':reportId'].$get({
        param: { reportId: id },
      });
      if (!response.ok) throw await createApiError(response, 'Could not load this report.');
      return (await response.json()).data;
    },
  });
}
