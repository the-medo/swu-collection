import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';

export interface SendTournamentDiscordResultsRequest {
  force?: boolean;
  dryRun?: boolean;
  runScreenshotter?: boolean;
}

type TournamentDiscordResultsStatus = 'skipped' | 'dry-run' | 'sent' | 'failed';

interface TournamentDiscordResultsData {
  status: TournamentDiscordResultsStatus;
  tournamentId: string;
  reason?: string;
  error?: string;
  discordMessageId?: string;
}

export interface SendTournamentDiscordResultsResponse {
  message: string;
  data: TournamentDiscordResultsData;
  meta: {
    force: boolean;
    dryRun: boolean;
    runScreenshotter: boolean;
    screenshotter?: {
      success: number;
      errors: number;
      manifestUrl?: string;
    };
  };
}

function getErrorMessage(errorData: unknown, fallback: string) {
  if (errorData && typeof errorData === 'object' && 'error' in errorData) {
    const error = (errorData as { error?: unknown }).error;
    if (typeof error === 'string') return error;
  }

  if (errorData && typeof errorData === 'object' && 'data' in errorData) {
    const data = (errorData as { data?: unknown }).data;

    if (data && typeof data === 'object' && 'error' in data) {
      const error = (data as { error?: unknown }).error;
      if (typeof error === 'string') return error;
    }
  }

  if (errorData && typeof errorData === 'object' && 'message' in errorData) {
    const message = (errorData as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }

  return fallback;
}

export const useSendTournamentDiscordResults = (tournamentId: string) => {
  const queryClient = useQueryClient();

  return useMutation<
    SendTournamentDiscordResultsResponse,
    ErrorWithStatus,
    SendTournamentDiscordResultsRequest | undefined
  >({
    mutationFn: async variables => {
      const response = await api.tournament[':id']['discord-results'].$post({
        param: { id: tournamentId },
        json: variables ?? {},
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => undefined);
        const error: ErrorWithStatus = new Error(
          getErrorMessage(errorData, 'Failed to send tournament results Discord message'),
        );
        error.status = response.status;
        throw error;
      }

      return (await response.json()) as SendTournamentDiscordResultsResponse;
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });

      if (data.data.status === 'sent') {
        toast({
          title: 'Discord results sent',
          description: data.data.discordMessageId
            ? `Message ${data.data.discordMessageId} was sent.`
            : data.message,
        });
        return;
      }

      if (data.data.status === 'skipped') {
        toast({
          title: 'Discord results skipped',
          description: data.data.reason ?? data.message,
        });
        return;
      }

      toast({
        title: 'Discord results dry run completed',
        description: data.message,
      });
    },
    onError: error => {
      toast({
        variant: 'destructive',
        title: 'Discord results failed',
        description: error.message,
      });
    },
  });
};
