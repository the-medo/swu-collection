import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { createApiError } from '@/api/errors';
import { patreonKeys } from './queryKeys';
import type { PatreonSyncResult } from '../../../../shared/types/patreon';

export function useSyncPatreon() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<PatreonSyncResult> => {
      const response = await api.admin.patreon.sync.$post(
        {},
        { headers: { 'X-Requested-With': 'swubase' } },
      );
      if (!response.ok)
        throw await createApiError(response, 'Could not synchronize Patreon supporters.');
      return (await response.json()).data;
    },
    // Earlier pages can already be committed when a later provider page fails.
    onSettled: () => client.invalidateQueries({ queryKey: patreonKeys.all }),
  });
}
