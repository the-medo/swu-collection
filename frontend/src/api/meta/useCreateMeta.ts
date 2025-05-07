import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { ZMetaCreateRequest } from '../../../../types/ZMeta.ts';
import type { MetaData } from './useGetMetas.ts';

export interface CreateMetaResponse {
  data: MetaData['meta'];
}

export const useCreateMeta = () => {
  const queryClient = useQueryClient();

  return useMutation<CreateMetaResponse, Error, ZMetaCreateRequest>({
    mutationFn: async (data) => {
      const response = await api.meta.$post({
        json: data,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create meta');
      }

      return response.json() as Promise<CreateMetaResponse>;
    },
    onSuccess: () => {
      // Invalidate the metas query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['metas'] });
    },
  });
};