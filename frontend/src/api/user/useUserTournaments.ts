import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { userTournamentKeys } from './tournamentKeys.ts';

export function useUserTournaments(userId: string, options?: { refetchOnWindowFocus?: 'always' }) {
  return useQuery({
    queryKey: userTournamentKeys.profile(userId),
    staleTime: 60_000,
    refetchOnWindowFocus: options?.refetchOnWindowFocus,
    queryFn: userId
      ? async () => {
          const response = await api.user[':id'].tournaments.$get({ param: { id: userId } });
          if (!response.ok) throw await createApiError(response, 'Could not load tournaments.');
          return (await response.json()).data;
        }
      : skipToken,
  });
}
