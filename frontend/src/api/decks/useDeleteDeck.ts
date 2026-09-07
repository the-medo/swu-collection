import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';

type DeckListCache = InfiniteData<{
  data?: { deck?: { id?: string } }[];
}>;

export const removeDeckFromListCache = (queryClient: QueryClient, deckId: string) => {
  queryClient.setQueriesData<DeckListCache>({ queryKey: ['decks'] }, current => {
    if (!current) return current;

    let didChange = false;
    const pages = current.pages.map(page => {
      if (!page.data) return page;

      const data = page.data.filter(item => item.deck?.id !== deckId);
      if (data.length === page.data.length) return page;

      didChange = true;
      return { ...page, data };
    });

    return didChange ? { ...current, pages } : current;
  });
};

export const useDeleteDeck = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deckId: string) => {
      const response = await api.deck[':id'].$delete({
        param: { id: deckId },
      });
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      return response.json();
    },
    onSuccess: (_result, deckId) => {
      removeDeckFromListCache(queryClient, deckId);

      queryClient.invalidateQueries({
        queryKey: ['deck', deckId],
        exact: true,
      });
    },
    onError: error => {
      toast({
        variant: 'destructive',
        title: 'Error while deleting deck',
        description: error.toString(),
      });
    },
  });
};
