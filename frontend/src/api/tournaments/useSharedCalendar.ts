import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/lib/auth-client.ts';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { calendarSharingKeys } from './calendarSharingKeys.ts';
import type { SharedTournamentCalendar } from '../../../../types/TournamentCalendar.ts';

export function useSharedCalendar(ownerId: string) {
  const { data: session, isPending } = useSession();
  const viewerId = session?.user.id;
  return useQuery({
    queryKey: calendarSharingKeys.user(viewerId, ownerId),
    enabled: !isPending,
    queryFn: async ({ signal }): Promise<SharedTournamentCalendar> => {
      const response = await api['user-calendar'][':userId'].$get(
        { param: { userId: ownerId } },
        { init: { signal } },
      );
      if (!response.ok) throw await createApiError(response, 'Could not load this calendar.');
      return (await response.json()).data;
    },
    // Access can change with calendar privacy or team membership. Never persist shared plans.
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchInterval: 60_000,
  });
}
