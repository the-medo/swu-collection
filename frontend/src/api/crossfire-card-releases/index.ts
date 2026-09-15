import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { createApiError } from '@/api/errors';
import type { CardReleaseSelection } from '../../../../shared/types/crossfire-card-releases';
const keys = { all: ['crossfire-card-releases'] as const };
export function useCardReleases() {
  return useQuery({
    queryKey: keys.all,
    staleTime: 30_000,
    queryFn: async () => {
      const response = await api.admin['crossfire-cards'].$get();
      if (!response.ok) throw await createApiError(response, 'Could not load card releases');
      return (await response.json()).data;
    },
  });
}
export function useCardReleasePreview() {
  return useMutation({
    mutationFn: async (selection: CardReleaseSelection) => {
      const response = await api.admin['crossfire-cards'].preview.$post({ json: selection });
      if (!response.ok) throw await createApiError(response, 'Could not inspect card release');
      return (await response.json()).data;
    },
  });
}
export function useActivateCardRelease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (selection: CardReleaseSelection & { expectedActive: string }) => {
      const response = await api.admin['crossfire-cards'].activate.$post({ json: selection });
      if (!response.ok) throw await createApiError(response, 'Could not activate card release');
      return (await response.json()).data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.all });
      await queryClient.invalidateQueries({ queryKey: ['crossfire'] });
    },
  });
}
