import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useUser } from '@/hooks/useUser';
import { useRole } from '@/hooks/useRole';
import { createApiError } from '@/api/errors';
import { patreonKeys } from './queryKeys';
import type { PatreonOverview } from '../../../../shared/types/patreon';

export function usePatreonOverview(page: number) {
  const actor = useUser();
  const isAdmin = useRole()('admin');
  return useQuery({
    queryKey: patreonKeys.overview(actor?.id, page),
    enabled: !!actor && isAdmin,
    staleTime: 0,
    gcTime: 0,
    queryFn: async (): Promise<PatreonOverview> => {
      const response = await api.admin.patreon.$get({ query: { page: String(page) } });
      if (!response.ok) throw await createApiError(response, 'Could not load Patreon supporters.');
      return (await response.json()).data;
    },
  });
}
