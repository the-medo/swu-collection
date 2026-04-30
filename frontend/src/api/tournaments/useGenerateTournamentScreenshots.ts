import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import type {
  ScreenshotterManifest,
  TournamentScreenshotTarget,
} from '../../../../types/Screenshotter.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';

export interface GenerateTournamentScreenshotsRequest {
  targets?: TournamentScreenshotTarget[];
  force?: boolean;
}

export interface GenerateTournamentScreenshotsResponse {
  message: string;
  data: ScreenshotterManifest;
  meta: {
    success: number;
    errors: number;
    manifestUrl?: string;
    persistence?: unknown;
    force: boolean;
  };
}

function getErrorMessage(errorData: unknown, fallback: string) {
  if (errorData && typeof errorData === 'object' && 'message' in errorData) {
    const message = (errorData as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }

  if (errorData && typeof errorData === 'object' && 'error' in errorData) {
    const error = (errorData as { error?: unknown }).error;
    if (typeof error === 'string') return error;
  }

  return fallback;
}

export const useGenerateTournamentScreenshots = (tournamentId: string) => {
  const queryClient = useQueryClient();

  return useMutation<
    GenerateTournamentScreenshotsResponse,
    ErrorWithStatus,
    GenerateTournamentScreenshotsRequest | undefined
  >({
    mutationFn: async variables => {
      const response = await api.tournament[':id'].screenshots.$post({
        param: { id: tournamentId },
        json: variables ?? {},
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => undefined);
        const error: ErrorWithStatus = new Error(
          getErrorMessage(errorData, 'Failed to generate tournament screenshots'),
        );
        error.status = response.status;
        throw error;
      }

      return (await response.json()) as GenerateTournamentScreenshotsResponse;
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });

      toast({
        title:
          data.meta.errors > 0
            ? 'Tournament screenshots completed with errors'
            : 'Tournament screenshots generated',
        description: `${data.meta.success} successful, ${data.meta.errors} failed.`,
        variant: data.meta.errors > 0 ? 'destructive' : 'default',
      });
    },
    onError: error => {
      toast({
        variant: 'destructive',
        title: 'Screenshot generation failed',
        description: error.message,
      });
    },
  });
};
