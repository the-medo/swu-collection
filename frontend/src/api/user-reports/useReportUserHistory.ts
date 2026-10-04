import { useQuery } from '@tanstack/react-query';
import { useRole } from '@/hooks/useRole';
import { useUser } from '@/hooks/useUser';
import { api } from '@/lib/api';
import { createApiError } from '@/api/errors';
import { userReportKeys } from './queryKeys';
import type { ModerationUser } from '../../../../shared/types/userReportModeration';
export function useReportUserHistory(id: string) {
  const actor = useUser();
  const isAdmin = useRole()('admin');
  return useQuery({
    queryKey: userReportKeys.user(actor?.id, id),
    enabled: isAdmin && !!id,
    staleTime: 0,
    gcTime: 0,
    queryFn: async (): Promise<ModerationUser> => {
      const response = await api.admin['user-reports'].users[':userId'].$get({
        param: { userId: id },
      });
      if (!response.ok) throw await createApiError(response, 'Could not load report history.');
      return (await response.json()).data;
    },
  });
}
