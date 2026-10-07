import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { imageGalleryKeys } from './queryKeys.ts';

export function useUploadGalleryImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, file }: { title: string; file: File }) => {
      const response = await api['image-gallery'].$post(
        { form: { title, file } },
        { headers: { 'X-Requested-With': 'swubase' } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not upload this image.');
      return (await response.json()).data;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: imageGalleryKeys.all }),
    gcTime: 0,
  });
}
