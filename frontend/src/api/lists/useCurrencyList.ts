import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';

async function getCurrencyList() {
  const response = await api.world['currencies'].$get();
  if (!response.ok) {
    throw new Error('Something went wrong');
  }
  const data = await response.json();
  return data;
}

export const useCurrencyList = () => {
  return useQuery({
    queryKey: ['currencies'],
    queryFn: getCurrencyList,
    staleTime: Infinity,
  });
};
