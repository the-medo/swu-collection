import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { createApiError } from '@/api/errors';
import { creatorKeys } from '@/api/creators/keys';
import type {
  CreatorImport,
  CreatorImportPreview,
  CreatorImportResult,
} from '../../../../shared/creators/imports';

const root = api.admin['creator-imports'];
const headers = { 'X-Requested-With': 'swubase' };
async function data<T>(response: Response): Promise<T> {
  if (!response.ok) throw await createApiError(response, 'Could not import creators.');
  return (await response.json()).data as T;
}

export function usePreviewCreatorImport() {
  return useMutation({
    mutationFn: async (payload: CreatorImport) =>
      data<CreatorImportPreview>(await root.preview.$post({ json: payload }, { headers })),
  });
}

export function useApplyCreatorImport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { payload: CreatorImport; fingerprint: string }) =>
      data<CreatorImportResult>(await root.apply.$post({ json: input }, { headers })),
    onSuccess: () => client.invalidateQueries({ queryKey: creatorKeys.all }),
  });
}
