import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { useUser } from '@/hooks/useUser.ts';
import { createApiError } from '@/api/errors.ts';
import { userTournamentKeys } from './tournamentKeys.ts';
import type { TournamentReport } from '../../../../shared/types/TournamentReport.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';

export function useTournamentReport(tournamentId?: string, meleeUserId?: string) {
  const userId = useUser()?.id;
  return useQuery<TournamentReport, Error & ErrorWithStatus>({
    queryKey: [
      ...userTournamentKeys.report(userId ?? '', tournamentId),
      // A different linked Melee account must never reuse the previous player's results.
      ...(meleeUserId ? [meleeUserId] : []),
    ],
    staleTime: 60_000,
    retry: (failureCount, error) =>
      !(error.status && error.status >= 400 && error.status < 500) && failureCount < 3,
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
