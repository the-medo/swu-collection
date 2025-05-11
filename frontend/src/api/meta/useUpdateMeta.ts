import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { ZMetaUpdateRequest } from '../../../../types/ZMeta.ts';
import type { MetaData } from './useGetMetas.ts';

export interface UpdateMetaResponse {
  data: MetaData['meta'];
}

export interface UpdateMetaParams {
  id: number;
  data: ZMetaUpdateRequest;
}

export const useUpdateMeta = () => {
  const queryClient = useQueryClient();

  return useMutation<UpdateMetaResponse, Error, UpdateMetaParams>({
    mutationFn: async ({ id, data }) => {
      const response = await api.meta[':id'].$put({
        param: {
          id: id.toString(),
        },
        json: data,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update meta');
      }

      return response.json() as Promise<UpdateMetaResponse>;
    },
    onSuccess: (_, variables) => {
      // Invalidate the specific meta query and the metas list
      queryClient.invalidateQueries({ queryKey: ['meta', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['metas'] });
    },
  });
};