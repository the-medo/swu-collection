import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSession } from '@/lib/auth-client';
import { useRole } from '@/hooks/useRole';
import { createApiError } from '@/api/errors';
const keys = { all: ['crossfire-access'] as const };
export function useCrossfireAccess(search: string) {
  const { data: session } = useSession();
  const isAdmin = useRole()('admin');
  return useQuery({
    queryKey: [...keys.all, session?.session.id, search],
    enabled: !!session && isAdmin,
    staleTime: 10_000,
    queryFn: async () => {
      const response = await api.admin['crossfire-access'].$get({ query: { search } });
      if (!response.ok) throw await createApiError(response, 'Could not load Crossfire access');
      return (await response.json()).data;
    },
  });
}
export function useSetCrossfireAccess() {
  const queryClient = useQueryClient();
  const { data: session, refetch } = useSession();
  return useMutation({
    mutationFn: async ({ userId, enabled }: { userId: string; enabled: boolean }) => {
      const response = await api.admin['crossfire-access'][':userId'].$patch({
        param: { userId },
        json: { enabled },
      });
      if (!response.ok) throw await createApiError(response, 'Could not update Crossfire access');
      return (await response.json()).data;
    },
    onSuccess: async result => {
      if (result.id === session?.user.id) await refetch();
      await queryClient.invalidateQueries({ queryKey: keys.all });
      await queryClient.invalidateQueries({ queryKey: ['crossfire'] });
    },
  });
}
