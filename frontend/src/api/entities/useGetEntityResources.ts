import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { type EntityResource } from './usePostEntity.ts';

export interface EntityResourcesResponse {
  data: EntityResource[];
}

export const useGetEntityResources = (entityId: string | undefined) => {
  return useQuery<EntityResourcesResponse>({
    queryKey: ['entity-resources', entityId],
    queryFn: entityId
      ? async () => {
          const response = await api.entities[':id'].$get({
            param: {
              id: entityId,
            },
          });
          if (!response.ok) {
            throw new Error('Something went wrong');
          }
          return response.json();
        }
      : skipToken,
    staleTime: Infinity,
  });
};
