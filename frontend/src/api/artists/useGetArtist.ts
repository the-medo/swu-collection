import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { getArtistKey } from '../../../../shared/lib/artists.ts';
import type { ArtistIdentity, ArtistShowcase } from '../../../../types/Artist.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';

export const artistQueryKeys = {
  all: ['artists'] as const,
  names: ['artists', 'identities'] as const,
  detail: (key: string) => [...artistQueryKeys.all, 'showcase', key] as const,
};

export function useGetArtistNames() {
  return useQuery<ArtistIdentity[], ErrorWithStatus>({
    queryKey: artistQueryKeys.names,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const response = await api.artists.$get();
      if (!response.ok) throw await createApiError(response, 'Failed to load artist names');
      return (await response.json()).data;
    },
  });
}

export function useGetArtist(artistKey: string) {
  const key = getArtistKey(artistKey);
  return useQuery<ArtistShowcase, ErrorWithStatus>({
    queryKey: artistQueryKeys.detail(key),
    enabled: !!key,
    staleTime: 5 * 60 * 1000,
    retry: (count, error) => error.status !== 404 && count < 2,
    queryFn: async () => {
      // Hono's client interpolates path params verbatim; credits can contain ? or #.
      const response = await api.artists[':artistKey'].$get({
        param: { artistKey: encodeURIComponent(key) },
      });
      if (!response.ok) throw await createApiError(response, 'Failed to load artist');
      return (await response.json()).data;
    },
  });
}
