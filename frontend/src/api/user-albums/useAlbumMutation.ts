import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';
import { api } from '@/lib/api.ts';
import { userAlbumKeys } from './queryKeys.ts';
import { albumData } from './client.ts';
import type {
  createUserAlbumInput,
  updateUserAlbumInput,
  addAlbumImagesInput,
  updateAlbumImageInput,
  AlbumMutationResult,
} from '../../../../types/UserAlbum.ts';

export type AlbumAction =
  | { action: 'create'; input: z.input<typeof createUserAlbumInput> }
  | { action: 'update'; id: string; input: z.infer<typeof updateUserAlbumInput> }
  | { action: 'delete'; id: string; revision: number }
  | { action: 'add'; id: string; input: z.infer<typeof addAlbumImagesInput> }
  | { action: 'image'; id: string; fileId: string; input: z.infer<typeof updateAlbumImageInput> }
  | { action: 'remove'; id: string; fileId: string; revision: number };
const options = { headers: { 'X-Requested-With': 'swubase' } };

export function useAlbumMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (command: AlbumAction): Promise<AlbumMutationResult> => {
      if (command.action === 'create')
        return albumData(await api['user-albums'].$post({ json: command.input }, options));
      const param = { id: command.id };
      const route = api['user-albums'][':id'];
      switch (command.action) {
        case 'update':
          return albumData(await route.$patch({ param, json: command.input }, options));
        case 'delete':
          return albumData(
            await route.$delete({ param, json: { revision: command.revision } }, options),
          );
        case 'add':
          return albumData(await route.images.$post({ param, json: command.input }, options));
        case 'image':
          return albumData(
            await route.images[':fileId'].$patch(
              { param: { ...param, fileId: command.fileId }, json: command.input },
              options,
            ),
          );
        case 'remove':
          return albumData(
            await route.images[':fileId'].$delete(
              { param: { ...param, fileId: command.fileId }, json: { revision: command.revision } },
              options,
            ),
          );
      }
    },
    onSettled: () => client.invalidateQueries({ queryKey: userAlbumKeys.all }),
    gcTime: 0,
  });
}
