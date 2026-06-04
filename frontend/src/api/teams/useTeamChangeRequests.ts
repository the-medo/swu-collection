import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { DeckChangeRequestListItem } from '../../../../types/ZDeckBranch.ts';

export const useTeamChangeRequests = (teamId: string | undefined) => {
  return useQuery({
    queryKey: ['team-change-requests', teamId],
    queryFn: teamId
      ? async () => {
          const response = await api.teams[':id']['change-requests'].$get({
            param: { id: teamId },
          });
          if (!response.ok) throw new Error('Failed to fetch change requests');
          const { data } = await response.json();
          return data as DeckChangeRequestListItem[];
        }
      : skipToken,
    staleTime: 60 * 1000,
  });
};
