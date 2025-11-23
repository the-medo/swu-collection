import { useMemo } from 'react';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { selectDefaultVariant } from '../../../server/lib/cards/selectDefaultVariant.ts';

export interface DeckLeaderOrBaseResult {
  id: string;
  card: any;
  cardVariantId?: string;
}

export interface UseDeckLeaderAndBaseCardsResult {
  leader?: DeckLeaderOrBaseResult;
  base?: DeckLeaderOrBaseResult;
  deckLeaderId: string;
  deckBaseId: string;
  loading: boolean;
  isDeckFetching: boolean;
  isCardListFetching: boolean;
}

export const useDeckLeaderAndBaseCards = (deckId?: string): UseDeckLeaderAndBaseCardsResult => {
  const { data: deckData, isFetching: isDeckFetching } = useGetDeck(deckId);
  const { data: cardListData, isFetching: isCardListFetching } = useCardList();

  const deckLeaderId = deckData?.deck?.leaderCardId1 ?? '';
  const deckBaseId = deckData?.deck?.baseCardId ?? '';

  const leader = useMemo(() => {
    const id = deckLeaderId;
    if (!id || !cardListData?.cards) return undefined;
    const card = cardListData.cards[id];
    if (!card) return undefined;
    const cardVariantId = selectDefaultVariant(card);
    return { id, card, cardVariantId } as const;
  }, [deckLeaderId, cardListData?.cards]);

  const base = useMemo(() => {
    const id = deckBaseId;
    if (!id || !cardListData?.cards) return undefined;
    const card = cardListData.cards[id];
    if (!card) return undefined;
    const cardVariantId = selectDefaultVariant(card);
    return { id, card, cardVariantId } as const;
  }, [deckBaseId, cardListData?.cards]);

  const loading = isDeckFetching || isCardListFetching;

  return {
    leader,
    base,
    deckLeaderId,
    deckBaseId,
    loading,
    isDeckFetching,
    isCardListFetching,
  };
};
