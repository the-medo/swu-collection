import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { imageGalleryKeys } from './queryKeys.ts';

export function useImageGallery(page: number) {
  return useQuery({
    queryKey: imageGalleryKeys.list(page),
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const response = await api['image-gallery'].$get(
        { query: { page: String(page) } },
        { init: { signal } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not load the gallery.');
      return (await response.json()).data;
    },
  });
}
