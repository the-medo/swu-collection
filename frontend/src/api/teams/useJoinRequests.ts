import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';

export const useJoinRequests = (teamId: string | undefined) => {
  return useQuery({
    queryKey: ['team-join-requests', teamId],
    queryFn: teamId
      ? async () => {
          const response = await api.teams[':id']['join-request'].$get({
            param: { id: teamId },
          });
          if (!response.ok) {
            throw new Error('Failed to fetch join requests');
          }
          const { data } = await response.json();
          return data;
        }
      : skipToken,
  });
};
