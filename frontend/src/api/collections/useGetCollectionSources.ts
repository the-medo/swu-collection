import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type { Collection } from '../../../../types/Collection.ts';
import type { User } from '../../../../types/User.ts';

export type CollectionSourceMapping = {
  id: number;
  sourceCollectionId: string;
  collectionId: string;
  displayOnSource: boolean;
  createdAt: string;
};

export type CollectionSourceRow = {
  user: User;
  collection: Collection;
  collectionSource: CollectionSourceMapping;
};

export function useGetCollectionSources(params: {
  id?: string;
  target?: 'source' | 'target';
  displayOnSource?: boolean;
}) {
  const { id, target, displayOnSource } = params;
  return useQuery<CollectionSourceRow[], ErrorWithStatus>({
    queryKey: ['collection', id, 'sources', { target: target ?? 'target', displayOnSource }],
    queryFn: id
      ? async () => {
          const response = await api.collection[':id'].source.$get({
            param: { id },
            query: {
              ...(target ? { target } : {}),
              ...(displayOnSource === true ? { displayOnSource: 'true' } : {}),
              ...(displayOnSource === false ? { displayOnSource: 'false' } : {}),
            },
          });
          if (!response.ok) {
            const error: ErrorWithStatus = new Error('Failed to fetch collection sources');
            error.status = response.status;
            throw error;
          }
          const data = (await response.json()) as CollectionSourceRow[];
          return data;
        }
      : skipToken,
    staleTime: Infinity,
  });
}
