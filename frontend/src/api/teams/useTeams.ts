import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';

export const useTeams = () => {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await api.teams.my.$get();
      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }
      const { data } = await response.json();
      return data;
    },
  });
};
