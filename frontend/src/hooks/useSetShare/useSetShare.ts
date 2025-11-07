import { SwuSet } from '../../../../types/enums.ts';
import { useCallback } from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { DeckCard } from '../../../../types/ZDeckCard.ts';
import { rotationBlocks, setInfo } from '../../../../lib/swu-resources/set-info.ts';
import { CardStat } from '@/api/card-stats/useCardStats.ts';
import { useChartColorsAndGradients } from '@/components/app/tournaments/TournamentMeta/useChartColorsAndGradients.tsx';

export type SetShare = {
  total: number;
  setShare: Partial<Record<SwuSet, number>>;
  rotationBlockShare: Partial<Record<number, number>>;
};

export const useSetShare = () => {
  const { data: cardListData } = useCardList();
  const chartColors = useChartColorsAndGradients();

  const getEmptySetShare = useCallback(
    (): SetShare => ({
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

  const getSetShareChartData = useCallback(
    (setShare: SetShare, source: 'setShare' | 'rotationBlock') => {
      if (source === 'setShare') {
        const data = Object.entries(setShare.setShare).map(([set, quantity]) => ({
          id: set,
          label: setInfo[set as SwuSet].name,
          value: quantity,
          data: {
            quantity,
          },
          color: setInfo[set as SwuSet].hexColor,
        }));

        return {
          data,
          defs: data.map(d => chartColors(d.id, 'sets')),
          fill: data.map(item => ({
            match: { id: item.id },
            id: item.id,
          })),
        };
      } else {
        const data = Object.entries(setShare.rotationBlockShare).map(
          ([rotationBlock, quantity]) => ({
            id: rotationBlock,
            label: rotationBlocks[parseInt(rotationBlock)].name,
            value: quantity,
            data: {
              quantity,
            },
            color: rotationBlocks[parseInt(rotationBlock)].hexColor,
          }),
        );

        return {
          data,
          defs: data.map(d => chartColors(d.id, 'rotationBlocks')),
          fill: data.map(item => ({
            match: { id: item.id },
            id: item.id,
          })),
        };
      }
    },
    [chartColors],
  );

  return {
    getEmptySetShare,
    addDeckCardToSetShare,
    addDeckCardsToSetShare,
    addCardStatToSetShare,
    addCardStatsToSetShare,
    getSetShareChartData,
  };
};
