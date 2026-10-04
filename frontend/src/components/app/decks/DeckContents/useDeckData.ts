import { useGetDeckCards } from '@/api/decks/useGetDeckCards.ts';
import { useMemo } from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { buildDeckCardsForLayout } from '@/components/app/decks/DeckContents/DeckCards/deckCardsLib.ts';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import { UserSettings } from '../../../../../../shared/lib/userSettings.ts';

const emptyLeaderAndBaseCards = [undefined, undefined];

export type KarabastUnimplementedSummary = {
  uniqueCardIds: string[];
};

/**
 * Hook to get all deck data including leader, base, cards, and user info
 */
export function useDeckData(
  deckId: string,
  groupByUserSettingKey: keyof UserSettings = 'deckGroupBy',
) {
  const { data: deckInfo } = useGetDeck(deckId);
  const { data: cardList } = useCardList();
  const { data: deckCardsData } = useGetDeckCards(deckId);

  const deckCards = useMemo(() => deckCardsData?.data ?? [], [deckCardsData?.data]);

  // Get additional deck meta information
  const deckMeta = useMemo(() => {
    return {
      leader1: deckInfo?.deck.leaderCardId1 ? cardList?.cards[deckInfo.deck.leaderCardId1] : null,
      leader2: deckInfo?.deck.leaderCardId2 ? cardList?.cards[deckInfo.deck.leaderCardId2] : null,
      base: deckInfo?.deck.baseCardId ? cardList?.cards[deckInfo.deck.baseCardId] : null,
      name: deckInfo?.deck.name || '',
      author: deckInfo?.user.displayName || '',
      format: deckInfo?.deck.format || 1,
      cardPoolId: deckInfo?.deck.cardPoolId,
    };
  }, [deckInfo, cardList]);

  // Get the current groupBy value from the store
  const { data: groupBy } = useGetUserSetting(groupByUserSettingKey);

  // Process deck data for display
  const deckCardsForLayout = useMemo(
    () =>
      buildDeckCardsForLayout(cardList?.cards, deckCards, groupBy, [
        deckMeta.leader1,
        deckMeta.leader2,
        deckMeta.base,
      ]),
    [cardList, deckCards, deckMeta.base, deckMeta.leader1, deckMeta.leader2, groupBy],
  );

  const leaderCardId = deckInfo?.deck.leaderCardId1;
  const baseCardId = deckInfo?.deck.baseCardId;
  const [leaderCard, baseCard] = useMemo(() => {
    if (!cardList || !leaderCardId || !baseCardId) return emptyLeaderAndBaseCards;
    return [cardList.cards[leaderCardId], cardList.cards[baseCardId]];
  }, [cardList, leaderCardId, baseCardId]);

  const karabastUnimplementedDeckCardsSummary = useMemo<KarabastUnimplementedSummary>(() => {
    const uniqueCardIds = new Set<string>();

    deckCards
      .filter(deckCard => deckCard.quantity > 0 && (deckCard.board === 1 || deckCard.board === 2))
      .forEach(deckCard => {
        if (cardList?.cards[deckCard.cardId]?.karabast_unimplemented) {
          uniqueCardIds.add(deckCard.cardId);
        }
      });

    return {
      uniqueCardIds: [...uniqueCardIds].sort((a, b) => a.localeCompare(b)),
    };
  }, [cardList, deckCards]);

  const karabastUnimplementedLeaderBaseSummary = useMemo<KarabastUnimplementedSummary>(() => {
    const uniqueCardIds = new Set<string>();

    [deckInfo?.deck.leaderCardId1, deckInfo?.deck.leaderCardId2, deckInfo?.deck.baseCardId].forEach(
      cardId => {
        if (cardId && cardList?.cards[cardId]?.karabast_unimplemented) {
          uniqueCardIds.add(cardId);
        }
      },
    );

    return {
      uniqueCardIds: [...uniqueCardIds].sort((a, b) => a.localeCompare(b)),
    };
  }, [
    cardList,
    deckInfo?.deck.baseCardId,
    deckInfo?.deck.leaderCardId1,
    deckInfo?.deck.leaderCardId2,
  ]);

  return {
    deckCardsForLayout,
    deckMeta,
    leaderCard,
    baseCard,
    karabastUnimplementedDeckCardsSummary,
    karabastUnimplementedLeaderBaseSummary,
    isLoading: !deckInfo || !cardList || !deckCardsData,
  };
}
