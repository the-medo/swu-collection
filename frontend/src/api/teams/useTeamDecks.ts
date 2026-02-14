import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';

export const useTeamDecks = (teamId: string | undefined) => {
  return useQuery({
    queryKey: ['team-decks', teamId],
    queryFn: teamId
      ? async () => {
          const response = await api.teams[':id'].decks.$get({
            param: { id: teamId },
          });
          if (!response.ok) {
            throw new Error('Failed to fetch team decks');
          }
          const { data } = await response.json();
          return data;
        }
      : skipToken,
  });
};
