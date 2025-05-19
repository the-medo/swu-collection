import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { type ZGenerateThumbnailsParams } from '../../../../types/ZGenerateThumbnailsParams.ts';

export interface TournamentThumbnailsResult {
  success: number;
  errors: number;
  thumbnails: { tournamentId: string; thumbnailUrl: string }[];
  errorDetails: { tournamentId: string; error: string }[];
  tournamentId?: string;
}

/**
 * Hook to generate thumbnails for tournaments.
 * If tournament_id is provided, only generates thumbnail for that tournament.
 * Otherwise, generates thumbnails for all tournaments.
 * This is an admin-only operation.
 */
export const useGenerateTournamentThumbnails = () => {
  return useMutation<TournamentThumbnailsResult, Error, { force?: boolean, tournament_id?: string }>({
    mutationFn: async (payload: ZGenerateThumbnailsParams) => {
      const { force, tournament_id } = payload;
      const response = await api.tournament.thumbnails.$post({
        query: { force, tournament_id },
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
        title: 'Error while generating tournament thumbnails',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    },
  });
};