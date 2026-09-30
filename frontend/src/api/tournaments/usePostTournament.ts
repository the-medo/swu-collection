import { tournamentMapKeys } from './mapQueryKeys.ts';
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { TournamentStringDate } from '../../../../types/Tournament.ts';
import { ZTournamentCreateRequest } from '../../../../types/ZTournament.ts';

async function postTournament(data: ZTournamentCreateRequest) {
  const response = await api.tournament.$post({ json: data });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error('message' in errorData ? errorData.message : 'Failed to create tournament');
  }
  return response.json() as Promise<{ data: TournamentStringDate }>;
}

function invalidateCreatedTournaments(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['tournaments'] }),
    queryClient.invalidateQueries({ queryKey: ['tournament-locations'] }),
    queryClient.invalidateQueries({ queryKey: tournamentMapKeys.all }),
  ]);
}

export const usePostTournaments = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tournaments: ZTournamentCreateRequest[]) => {
      // Wait for every request, including after a partial failure, before refreshing lists.
      const results = await Promise.allSettled(tournaments.map(postTournament));
      const failed = results.filter(result => result.status === 'rejected');
      return {
        created: results.length - failed.length,
        failed: failed.length,
        error: failed[0]?.reason instanceof Error ? failed[0].reason.message : undefined,
      };
    },
    onSettled: () => invalidateCreatedTournaments(queryClient),
  });
};

export const usePostTournament = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postTournament,
    onSuccess: result => {
      // Invalidate relevant queries
      void invalidateCreatedTournaments(queryClient);

      toast({
        title: 'Tournament created successfully',
        description: `Tournament "${result.data.name}" has been created.`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create tournament',
        description: error.message,
      });
    },
  });
};
