import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { userFileKeys } from './queryKeys.ts';
import { userAlbumKeys } from '../user-albums/queryKeys.ts';

export function useDeleteUserFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { userId: string; id: string }) => {
      const response = await api['user-files'][':id'].$delete(
        { param: { id } },
        { headers: { 'X-Requested-With': 'swubase' } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not delete this image.');
      return (await response.json()).data;
    },
    onSuccess: (_data, { userId }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: userFileKeys.all(userId) }),
        queryClient.invalidateQueries({ queryKey: userAlbumKeys.all }),
      ]),
    gcTime: 0,
  });
}
