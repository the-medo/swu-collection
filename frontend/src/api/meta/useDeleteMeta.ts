import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';

export interface DeleteMetaResponse {
  success: boolean;
}

export const useDeleteMeta = () => {
  const queryClient = useQueryClient();

  return useMutation<DeleteMetaResponse, Error, number>({
    mutationFn: async (id) => {
      const response = await api.meta[':id'].$delete({
        param: {
          id: id.toString(),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete meta');
      }

      return response.json() as Promise<DeleteMetaResponse>;
    },
    onSuccess: (_, id) => {
      // Invalidate the specific meta query and the metas list
      queryClient.invalidateQueries({ queryKey: ['meta', id] });
      queryClient.invalidateQueries({ queryKey: ['metas'] });
    },
  });
};