import { useCardPoolDeckDetailStore } from '@/components/app/limited/CardPoolDeckDetail/useCardPoolDeckDetailStore.ts';
import { useGetCardPoolDeckCards } from '@/api/card-pools';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useCPLeaderBaseAspects } from '@/components/app/limited/CardPoolDeckDetail/CPTopFilters/useCPLeaderBaseAspects.ts';
import {
  aspectFilter,
  CardGroup,
  costFilter,
  CPDeckContent,
  ExpandedCardData,
  groupByKey,
  groupStacksWithin,
  keywordsFilter,
  traitsFilter,
  typeFilter,
} from '@/components/app/limited/CardPoolDeckDetail/CPContent/cpDeckContentLib.ts';
import { selectDefaultVariant } from '../../../../../../../server/lib/cards/selectDefaultVariant.ts';

export function useCPDeckContent(deckId: string | undefined, poolId: string | undefined) {
  /**
   * Data is in this format:
   *
   * {
   *   "1": { // this key of the object is "cardPoolNumber"
   *     "location": "pool",
   *     "cardId": "leia-organa--of-a-secret-bloodline"
   *   },
   *   "2": {
   *     "location": "pool",
   *     "cardId": "reckless-rebel"
   *   },
   *   ...
   * }
   */
  const { data, isFetching, error } = useGetCardPoolDeckCards(poolId, deckId);
  const { data: cardListData, isFetching: isCardListFetching } = useCardList();
  const leaderAndBaseAspects = useCPLeaderBaseAspects(deckId);

  const {
    showCardsInDeck,
    showRemovedCards,
    showUnfilteredCards,
    contentBoxesBy,
    contentStacksBy,
    filterAspects,
    exactAspects,
    filterCost,
    filterType,
    filterTraits,
    filterKeywords,
  } = useCardPoolDeckDetailStore();

  // 3-7) Compose result
  const result: CPDeckContent | undefined = (() => {
    if (!data || !cardListData || !cardListData.cards) return undefined;

    // 3) expand
    const expanded: ExpandedCardData[] = Object.entries(data).flatMap(([k, v]) => {
      if (!v) return [];
      const card = cardListData.cards[v.cardId];
      if (!card) return [];
      if (card.type === 'Leader' || card.type === 'Base') return [];
      return [
        {
          cardPoolNumber: Number(k),
          location: v.location,
          card,
          cardId: v.cardId,
          variantId: selectDefaultVariant(card) ?? '',
          filterSuccess: true,
        },
      ];
    });

    // 4) split
    const deck = expanded.filter(c => c.location === 'deck');
    const trash = expanded.filter(c => c.location === 'trash');
    const pool = expanded.filter(c => c.location === 'pool');

    let mainPool = pool.slice();
    if (showCardsInDeck) mainPool = mainPool.concat(deck);
    if (showRemovedCards) mainPool = mainPool.concat(trash);

    // 5) apply filters
    for (const item of mainPool) {
      const card = item.card;
      const ok =
        aspectFilter(card, filterAspects, exactAspects, leaderAndBaseAspects) &&
        costFilter(card, filterCost) &&
        typeFilter(card, filterType) &&
        traitsFilter(card, filterTraits) &&
        keywordsFilter(card, filterKeywords);
      item.filterSuccess = ok;
    }

    if (!showUnfilteredCards) {
      mainPool = mainPool.filter(c => c.filterSuccess);
    }

    // 6) group
    const boxes: CardGroup[] = (() => {
      if (contentBoxesBy === 'X') {
        const stacks = groupStacksWithin(mainPool, contentStacksBy);
        return [
          {
            title: 'All',
            cards: stacks.length > 0 ? stacks : [{ title: 'All', cards: mainPool }],
          },
        ];
      }

      // Create boxes in the prescribed order and then populate their stacks by contentStacksBy
      const baseBoxes = groupByKey(mainPool, contentBoxesBy as any);
      // Replace inner single stack with stacks by contentStacksBy
      return baseBoxes.map(box => ({
        title: box.title,
        cards: groupStacksWithin(
          // cards belonging to this box are the union of all inner stacks (from baseBoxes helper)
          box.cards.flatMap(s => s.cards),
          contentStacksBy,
        ),
      }));
    })();

    return {
      pool: { cards: mainPool, boxes },
      deck,
      trash,
    };
  })();

  return result;
}
