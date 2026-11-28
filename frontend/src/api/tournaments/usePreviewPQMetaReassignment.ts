import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import type { PQMetaReassignmentRequest } from '../../../../types/PQMetaReassignment.ts';

export function usePreviewPQMetaReassignment() {
  return useMutation({
    mutationFn: async (request: PQMetaReassignmentRequest) => {
      const response = await api.tournament.bulk['pq-reassign-metas'].preview.$post({
        json: request,
      });
      if (!response.ok) throw await createApiError(response, 'Could not preview PQ meta changes.');
      return (await response.json()).data;
    },
  });
}
