import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { userFileKeys } from './queryKeys.ts';

export function useUploadUserFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, signal }: { userId: string; file: File; signal?: AbortSignal }) => {
      const response = await api['user-files'].$post(
        { form: { file } },
        { headers: { 'X-Requested-With': 'swubase' }, init: { signal } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not upload this image.');
      return (await response.json()).data;
    },
    onSettled: (_data, _error, { userId }) =>
      queryClient.invalidateQueries({ queryKey: userFileKeys.all(userId) }),
    gcTime: 0,
  });
}
