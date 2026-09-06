import { useQuery } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { api } from '@/lib/api.ts';

export const tcgPlayerQueryKeys = {
  all: ['card-prices', 'tcgplayer'] as const,
  groups: () => [...tcgPlayerQueryKeys.all, 'groups'] as const,
  products: (groupId: number | null) =>
    [...tcgPlayerQueryKeys.all, 'groups', groupId, 'products'] as const,
};

export function useGetTcgPlayerGroups() {
  return useQuery({
    queryKey: tcgPlayerQueryKeys.groups(),
    queryFn: async () => {
      const response = await api['card-prices'].tcgplayer.groups.$get();
      if (!response.ok) throw await createApiError(response, 'Failed to fetch TCGplayer groups');
      return (await response.json()).data;
    },
    staleTime: 60 * 60 * 1000,
  });
}

export function useGetTcgPlayerProducts(groupId: number | null) {
  return useQuery({
    queryKey: tcgPlayerQueryKeys.products(groupId),
    queryFn: async () => {
      if (groupId === null) throw new Error('A TCGplayer group is required');

      const response = await api['card-prices'].tcgplayer.groups[':groupId'].products.$get({
        param: { groupId: String(groupId) },
      });
      if (!response.ok) throw await createApiError(response, 'Failed to fetch TCGplayer products');
      return (await response.json()).data;
    },
    enabled: false,
    staleTime: 60 * 60 * 1000,
  });
}
