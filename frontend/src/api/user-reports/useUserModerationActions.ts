import { useQuery } from '@tanstack/react-query';
import { useRole } from '@/hooks/useRole';
import { useUser } from '@/hooks/useUser';
import { api } from '@/lib/api';
import { createApiError } from '@/api/errors';
import { userReportKeys } from './queryKeys';
import type { ModerationActionPage } from '../../../../shared/types/userReportModeration';
export function useUserModerationActions(id: string, page: number) {
  const actor = useUser();
  const isAdmin = useRole()('admin');
  return useQuery({
    queryKey: userReportKeys.actions(actor?.id, id, page),
    enabled: isAdmin && !!id,
    staleTime: 0,
    gcTime: 0,
    queryFn: async (): Promise<ModerationActionPage> => {
      const response = await api.admin['user-reports'].users[':userId'].actions.$get({
        param: { userId: id },
        query: { page: String(page) },
      });
      if (!response.ok)
        throw await createApiError(response, 'Could not load moderation decisions.');
      return (await response.json()).data;
    },
  });
}
