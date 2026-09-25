import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { createApiError } from '@/api/errors';
import type { AiActivation, AiSelection } from '../../../../shared/types/crossfire-ai-releases';
export const aiKeys = {
  all: ['crossfire-ai'] as const,
  releases: ['crossfire-ai', 'releases'] as const,
};
export function useAiReleases() {
  return useQuery({
    queryKey: aiKeys.releases,
    staleTime: 30_000,
    queryFn: async () => {
      const response = await api.admin['crossfire-ai'].$get();
      if (!response.ok) throw await createApiError(response, 'Could not load AI releases');
      return (await response.json()).data;
    },
  });
}
export function useAiReleasePreview() {
  return useMutation({
    mutationFn: async (selection: AiSelection) => {
      const response = await api.admin['crossfire-ai'].preview.$post({ json: selection });
      if (!response.ok) throw await createApiError(response, 'Could not validate AI release');
      return (await response.json()).data;
    },
  });
}
export function useActivateAiRelease() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (selection: AiActivation) => {
      const response = await api.admin['crossfire-ai'].activate.$post({ json: selection });
      if (!response.ok) throw await createApiError(response, 'Could not activate AI release');
      return (await response.json()).data;
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: aiKeys.all });
      await client.invalidateQueries({ queryKey: ['crossfire'] });
    },
  });
}

export function useImportAiRelease() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (files: { manifest: File; weights: File }) => {
      const form = new FormData();
      form.set('manifest', files.manifest);
      form.set('weights', files.weights);
      const response = await fetch('/api/admin/crossfire-ai/upload', {
        method: 'POST',
        body: form,
        credentials: 'include',
      });
      if (!response.ok) throw await createApiError(response, 'Could not import AI release');
      return (await response.json()).data as AiSelection;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: aiKeys.all }),
  });
}
