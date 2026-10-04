import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';

export function useEditorUsers(search: string) {
  const q = search.trim();
  return useQuery({
    queryKey: ['editor-public-profiles', q],
    enabled: q.length >= 2 && q.length <= 80,
    queryFn: async ({ signal }) => {
      const response = await api.user.search.$get({ query: { q } }, { init: { signal } });
      if (!response.ok) throw new Error('Could not search profiles.');
      return (await response.json()).data;
    },
    staleTime: 60_000,
    retry: 1,
  });
}
