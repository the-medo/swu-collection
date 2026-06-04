import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { DeckOpenBranchListItem } from '../../../../types/ZDeckBranch.ts';

export const useDeckBranches = (deckId: string | undefined, enabled = true) => {
  return useQuery({
    queryKey: ['deck-open-branches', deckId],
    queryFn:
      deckId && enabled
        ? async () => {
            const response = await api.deck[':id'].branches.$get({
              param: { id: deckId },
            });
            if (!response.ok) throw new Error('Failed to fetch deck branches');
            const { data } = await response.json();
            return data as DeckOpenBranchListItem[];
          }
        : skipToken,
    staleTime: 60 * 1000,
  });
};
