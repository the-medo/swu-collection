import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { userAlbumKeys } from './queryKeys.ts';
import { albumData } from './client.ts';
import type { AlbumMutationResult } from '../../../../types/UserAlbum.ts';

export function useModerateAlbumEventLink() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      revision,
      blocked,
    }: {
      id: string;
      revision: number;
      blocked: boolean;
    }) =>
      albumData<AlbumMutationResult>(
        await api.admin['user-albums'][':id']['event-link'].$post(
          { param: { id }, json: { revision, blocked } },
          { headers: { 'X-Requested-With': 'swubase' } },
        ),
      ),
    onSettled: () => client.invalidateQueries({ queryKey: userAlbumKeys.all }),
    gcTime: 0,
  });
}
