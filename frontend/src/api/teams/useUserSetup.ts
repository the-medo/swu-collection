import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';

export const useUserSetup = () => {
  return useQuery({
    queryKey: ['user-setup'],
    queryFn: async () => {
      const response = await api['user-setup'].$get();
      if (!response.ok) {
        throw new Error('Failed to fetch user setup');
      }
      const { data } = await response.json();
      return data;
    },
    staleTime: Infinity,
  });
};
