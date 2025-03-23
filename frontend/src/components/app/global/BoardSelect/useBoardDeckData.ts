import { useGetDeckCards } from '@/api/decks/useGetDeckCards.ts';
import { useMemo } from 'react';

export type BoardCardCounts = Record<number, number>;

export const useBoardDeckData = (deckId: string): BoardCardCounts => {
  const { data: deckCardsData } = useGetDeckCards(deckId);

  return useMemo(() => {
    const counts: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
    };

    (deckCardsData?.data ?? []).forEach(
      c => {
        if (!c) return;
        counts[c.board] += c.quantity;
      },
      [deckCardsData?.data],
    );

    return counts;
  }, [deckCardsData?.data]);
};
