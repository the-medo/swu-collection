import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const useGetKarabastGameResults = () => {
  return useQuery({
    queryKey: ['karabast-game-results'],
    queryFn: async () => {
      const res = await api.integration['karabast']['game-result'].$get();
      if (!res.ok) {
        throw new Error('Failed to fetch Karabast game results');
      }
      return res.json();
    },
  });
};
