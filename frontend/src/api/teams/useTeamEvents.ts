import { skipToken, useQuery } from '@tanstack/react-query';
import { useUser } from '@/hooks/useUser.ts';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { calendarSharingKeys } from '@/api/tournaments/calendarSharingKeys.ts';
import type { TeamCalendarEvent } from '../../../../types/TournamentCalendar.ts';

export function useTeamEvents(teamId: string, from: string) {
  const viewerId = useUser()?.id;
  return useQuery({
    queryKey: calendarSharingKeys.team(viewerId, teamId, from),
    queryFn: viewerId
      ? async ({ signal }): Promise<TeamCalendarEvent[]> => {
          const response = await api.teams[':id'].events.$get(
            { param: { id: teamId }, query: { from } },
            { init: { signal } },
          );
          if (!response.ok) throw await createApiError(response, 'Could not load team events.');
          return (await response.json()).data;
        }
      : skipToken,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchInterval: 60_000,
  });
}
