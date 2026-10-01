import { useEffect, useRef } from 'react';
import {
  skipToken,
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { useUser } from '@/hooks/useUser.ts';
import type {
  SavedTournament,
  TournamentSaveStatus,
} from '../../../../types/UserTournamentSave.ts';
import { patchSavedTournaments, savedTournamentKeys } from './savedTournamentCache.ts';
import { calendarSharingKeys } from './calendarSharingKeys.ts';

export function useSavedTournaments() {
  const userId = useUser()?.id;
  return useQuery({
    queryKey: savedTournamentKeys.user(userId),
    queryFn: userId
      ? async ({ signal }): Promise<SavedTournament[]> => {
          const response = await api['user-tournament-saves'].$get({}, { init: { signal } });
          if (!response.ok)
            throw await createApiError(response, 'Could not load your saved tournaments.');
          return (await response.json()).data;
        }
      : skipToken,
    // Account-scoped memory only: attendance plans never enter the public IndexedDB cache.
    staleTime: 5 * 60_000,
    gcTime: 5 * 60_000,
    retry: false,
  });
}

export function useSaveTournament(tournamentId: string) {
  const userId = useUser()?.id;
  const activeUser = useRef(userId);
  useEffect(() => {
    activeUser.current = userId;
    return () => {
      activeUser.current = undefined;
    };
  }, [userId]);
  const client = useQueryClient();
  const mutationKey = savedTournamentKeys.mutation(userId, tournamentId);
  const pending = useIsMutating({ mutationKey }) > 0;
  const mutation = useMutation({
    mutationKey,
    scope: { id: `save-tournament:${userId}:${tournamentId}` },
    gcTime: 0,
    onMutate: async ({
      userId: owner,
    }: {
      userId: string;
      status: TournamentSaveStatus | null;
    }) => {
      await client.cancelQueries({ queryKey: savedTournamentKeys.user(owner) });
    },
    mutationFn: async ({
      userId: owner,
      status,
    }: {
      userId: string;
      status: TournamentSaveStatus | null;
    }): Promise<SavedTournament | null> => {
      if (activeUser.current !== owner) throw new Error('Your account changed. Please try again.');
      if (status === null) {
        const response = await api['user-tournament-saves'][':tournamentId'].$delete({
          param: { tournamentId },
        });
        if (!response.ok) throw await createApiError(response, 'Could not remove this tournament.');
        return null;
      }
      const response = await api['user-tournament-saves'][':tournamentId'].$put({
        param: { tournamentId },
        json: { status },
      });
      if (!response.ok) throw await createApiError(response, 'Could not save this tournament.');
      return (await response.json()).data;
    },
    onSuccess: async (saved, { userId: owner }) => {
      const key = savedTournamentKeys.user(owner);
      // Stop older reads, then patch the shared map/calendar list without a refetch.
      await client.cancelQueries({ queryKey: key });
      client.setQueryData<SavedTournament[]>(key, current =>
        current ? patchSavedTournaments(current, tournamentId, saved) : undefined,
      );
      // Team/share projections must re-evaluate current membership and privacy on the server.
      await client.invalidateQueries({ queryKey: calendarSharingKeys.all });
    },
  });
  return { ...mutation, isPending: pending || mutation.isPending };
}
