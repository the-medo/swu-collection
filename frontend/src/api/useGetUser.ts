import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';

async function getUser(userId: string) {
  const response = await api.user[':id'].$get({
    param: {
      id: userId,
    },
  });
  if (!response.ok) {
    throw new Error('Something went wrong');
  }
  const data = await response.json();
  return data;
}

export const useGetUser = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: userId ? () => getUser(userId) : skipToken,
    staleTime: Infinity,
  });
};
