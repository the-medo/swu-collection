import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { useUser } from '@/hooks/useUser.ts';
import { createApiError } from '@/api/errors.ts';
import { userTournamentKeys } from './tournamentKeys.ts';

export function useTournamentReport(tournamentId?: string) {
  const userId = useUser()?.id;
  return useQuery({
    queryKey: userTournamentKeys.report(userId ?? '', tournamentId),
    staleTime: 60_000,
    queryFn:
      userId && tournamentId
        ? async () => {
            const response = await api.user[':id'].tournaments[':tournamentId'].report.$get({
              param: { id: userId, tournamentId },
            });
            if (!response.ok)
              throw await createApiError(response, 'Could not prepare your tournament report.');
            return (await response.json()).data;
          }
        : skipToken,
  });
}
