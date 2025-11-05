import { SwuSet } from '../../../../types/enums.ts';
import { useCallback } from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { DeckCard } from '../../../../types/ZDeckCard.ts';
import { setInfo } from '../../../../lib/swu-resources/set-info.ts';
import { CardStat } from '@/api/card-stats/useCardStats.ts';

export type SetShare = {
  total: number;
  setShare: Record<SwuSet, number | undefined>;
  rotationBlockShare: Record<number, number | undefined>;
};

export const useSetShare = () => {
  const { data: cardListData } = useCardList();

  const getEmptySetShare = useCallback(
    () => ({
      total: 0,
      setShare: {},
      rotationBlockShare: {},
    }),
    [],
  );

  const getCardSetAndRotationBlock = useCallback(
    (cardId: string) => {
      const c = cardListData?.cards[cardId];
      if (!c) return undefined;

      const { set: s } = c;
      const rotationBlockId = setInfo[s].rotationBlockId;
      if (!rotationBlockId) return undefined;

      return { s, rotationBlockId };
    },
    [cardListData],
  );

  const addCardToSetShare = useCallback(
    (setShare: SetShare, cardId: string, quantity: number) => {
      const setAndRotationBlock = getCardSetAndRotationBlock(cardId);
      if (!setAndRotationBlock) return setShare;
      const { s, rotationBlockId } = setAndRotationBlock;

      if (!setShare.setShare[s]) setShare.setShare[s] = 0;
      if (!setShare.rotationBlockShare[rotationBlockId])
        setShare.rotationBlockShare[rotationBlockId] = 0;

      setShare.total += quantity;
      setShare.setShare[s] += quantity;
      setShare.rotationBlockShare[rotationBlockId] += quantity;
    },
    [getCardSetAndRotationBlock],
  );

  const addDeckCardToSetShare = useCallback(
    (setShare: SetShare, deckCard: DeckCard) =>
      addCardToSetShare(setShare, deckCard.cardId, deckCard.quantity),
    [addCardToSetShare],
  );

  const addDeckCardsToSetShare = useCallback(
    (setShare: SetShare, deckCards: DeckCard[]) => {
      deckCards.forEach(deckCard => addDeckCardToSetShare(setShare, deckCard));
      return setShare;
    },
    [addDeckCardToSetShare],
  );

  const addCardStatToSetShare = useCallback(
    (setShare: SetShare, cardStat: CardStat, mdCards: boolean, sbCards: boolean) =>
      addCardToSetShare(
        setShare,
        cardStat.cardId,
        (mdCards ? cardStat.countMd : 0) + (sbCards ? cardStat.countSb : 0),
      ),
    [addCardToSetShare],
  );

  const addCardStatsToSetShare = useCallback(
    (setShare: SetShare, cardStats: CardStat[], mdCards: boolean, sbCards: boolean) => {
      cardStats.forEach(cardStat => addCardStatToSetShare(setShare, cardStat, mdCards, sbCards));
      return setShare;
    },
    [addCardStatToSetShare],
  );

  return {
    getEmptySetShare,
    addDeckCardToSetShare,
    addDeckCardsToSetShare,
    addCardStatToSetShare,
    addCardStatsToSetShare,
  };
};
