import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { imageGalleryKeys } from './queryKeys.ts';

export function useDeleteGalleryImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api['image-gallery'][':id'].$delete(
        { param: { id } },
        { headers: { 'X-Requested-With': 'swubase' } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not delete this image.');
      return (await response.json()).data;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: imageGalleryKeys.all }),
  });
}
