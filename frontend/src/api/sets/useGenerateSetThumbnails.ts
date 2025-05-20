import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { type ZGenerateSetThumbnailsParams } from '../../../../types/ZGenerateSetThumbnailsParams.ts';
import { SwuSet } from '../../../../types/enums.ts';

export interface SetThumbnailsResult {
  success: number;
  errors: number;
  thumbnails: { set: SwuSet; thumbnailUrls: string[] }[];
  errorDetails: { set: SwuSet; error: string }[];
  set?: SwuSet;
}

/**
 * Hook to generate thumbnails for sets.
 * If set is provided, only generates thumbnails for that specific set.
 * Otherwise, generates thumbnails for all sets.
 * This is an admin-only operation.
 */
export const useGenerateSetThumbnails = () => {
  return useMutation<SetThumbnailsResult, Error, { set?: SwuSet }>({
    mutationFn: async (payload: ZGenerateSetThumbnailsParams) => {
      const { set } = payload;
      const response = await api.set.thumbnails.$post({
        query: { set },
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    },
    onError: error => {
      toast({
        variant: 'destructive',
        title: 'Error while generating set thumbnails',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    },
  });
};