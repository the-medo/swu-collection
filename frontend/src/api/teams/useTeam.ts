import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';

export const useTeam = (idOrShortcut: string | undefined) => {
  return useQuery({
    queryKey: ['team', idOrShortcut],
    queryFn: idOrShortcut
      ? async () => {
          const response = await api.teams[':id'].$get({
            param: { id: idOrShortcut },
          });
          if (!response.ok) {
            if (response.status === 404) {
              const error: ErrorWithStatus = new Error('Team not found');
              error.status = 404;
              throw error;
            }
            throw new Error('Failed to fetch team');
          }
          const { data } = await response.json();
          return data;
        }
      : skipToken,
  });
};
