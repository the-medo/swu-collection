import { skipToken, useQuery } from '@tanstack/react-query';
import { createApiError } from '@/api/errors.ts';
import { useUser } from '@/hooks/useUser.ts';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type { LiveTournamentWatchedPlayerRoundsResponse } from '../../../../types/TournamentWeekend.ts';
import { tournamentWeekendQueryKeys } from './queryKeys';

// Mount only while the player's row is open. Unmounting cancels an outstanding fetch.
export const useWatchedPlayerRounds = (
  weekendId: string,
  tournamentId: string,
  displayName: string,
) => {
  const user = useUser();
  return useQuery<LiveTournamentWatchedPlayerRoundsResponse, ErrorWithStatus>({
    queryKey: tournamentWeekendQueryKeys.watchedPlayerRoundHistory(
      weekendId,
      user?.id ?? '',
      tournamentId,
      displayName,
    ),
    queryFn:
      user && weekendId && tournamentId && displayName
        ? async ({ signal }) => {
            const response = await api['tournament-weekends'][':id'].tournament[':tournamentId'][
              'watched-player-rounds'
            ].$get(
              { param: { id: weekendId, tournamentId }, query: { displayName } },
              { init: { signal } },
            );
            if (!response.ok) {
              throw await createApiError(response, 'Failed to load round history');
            }
            return response.json() as Promise<LiveTournamentWatchedPlayerRoundsResponse>;
          }
        : skipToken,
    // Reopening displays cached rounds immediately and checks for changes missed while closed.
    staleTime: 0,
    retry: false,
  });
};
