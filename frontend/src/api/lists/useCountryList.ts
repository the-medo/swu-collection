import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { CountryList } from '../../../../server/db/lists.ts';

async function getCountryList() {
  const response = await api.world['countries'].$get();
  if (!response.ok) {
    throw new Error('Something went wrong');
  }
  const data = (await response.json()) as { countries: CountryList };
  return data;
}

export const useCountryList = () => {
  return useQuery({
    queryKey: ['countries'],
    queryFn: getCountryList,
    staleTime: Infinity,
  });
};
