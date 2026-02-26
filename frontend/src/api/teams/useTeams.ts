import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { useUser } from '@/hooks/useUser.ts';
import type { UserTeam } from '../../../../server/routes/teams/get.ts';

export const useTeams = () => {
  const user = useUser();

  return useQuery({
    queryKey: ['teams', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const response = await api.teams.$get();
      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }
      const { data } = await response.json();
      return data as UserTeam[];
    },
  });
};
