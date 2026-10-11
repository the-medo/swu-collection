import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { createApiError } from '@/api/errors';
import { artistQueryKeys } from '@/api/artists/useGetArtist';
import {
  artistExportSchema,
  MAX_ARTIST_EXPORT_BYTES,
  type ArtistTransferApplyInput,
  type ArtistTransferPreviewInput,
} from '../../../../../shared/types/artistTransfer';

const artistTransferKeys = {
  status: ['admin', 'artists', 'status'] as const,
  snapshots: ['admin', 'artists', 'snapshots'] as const,
};

export function useArtistTransferStatus() {
  return useQuery({
    staleTime: 30_000,
    retry: 1,
    queryKey: artistTransferKeys.status,
    queryFn: async () => {
      const response = await api.admin.artists.$get();
      if (!response.ok)
        throw await createApiError(response, 'Could not load artist transfer settings');
      return (await response.json()).data;
    },
  });
}

export function useArtistSnapshots(enabled: boolean) {
  return useQuery({
    staleTime: 30_000,
    retry: 1,
    queryKey: artistTransferKeys.snapshots,
    enabled,
    queryFn: async () => {
      const response = await api.admin.artists.snapshots.$get({ query: {} });
      if (!response.ok) throw await createApiError(response, 'Could not list snapshots');
      return (await response.json()).data;
    },
  });
}

export function usePublishArtistSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await api.admin.artists.publish.$post();
      if (!response.ok) throw await createApiError(response, 'Could not publish artist data');
      return (await response.json()).data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: artistTransferKeys.snapshots }),
  });
}

export function useUploadArtistSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      if (file.size > MAX_ARTIST_EXPORT_BYTES)
        throw new Error('Choose a JSON file smaller than 10 MiB.');
      let json: unknown;
      try {
        json = JSON.parse(await file.text());
      } catch {
        throw new Error('The file is not valid JSON.');
      }
      const result = artistExportSchema.safeParse(json);
      if (!result.success)
        throw new Error(`Invalid artist snapshot: ${result.error.issues[0].message}`);
      const response = await api.admin.artists.upload.$post({ json: result.data });
      if (!response.ok) throw await createApiError(response, 'Could not upload snapshot');
      return (await response.json()).data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: artistTransferKeys.snapshots }),
  });
}

export function useDownloadArtistExport() {
  return useMutation({
    mutationFn: async () => {
      const response = await api.admin.artists.export.$get();
      if (!response.ok) throw await createApiError(response, 'Could not export artist data');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = 'artist-profiles.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  });
}

export function usePreviewArtistImport() {
  return useMutation({
    mutationFn: async (input: ArtistTransferPreviewInput) => {
      const response = await api.admin.artists.preview.$post({ json: input });
      if (!response.ok) throw await createApiError(response, 'Could not preview import');
      return (await response.json()).data;
    },
  });
}

export function useApplyArtistImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ArtistTransferApplyInput) => {
      const response = await api.admin.artists.apply.$post({ json: input });
      if (!response.ok) throw await createApiError(response, 'Could not import artist data');
      return (await response.json()).data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: artistTransferKeys.status }),
        queryClient.invalidateQueries({ queryKey: artistQueryKeys.all }),
      ]);
    },
  });
}
