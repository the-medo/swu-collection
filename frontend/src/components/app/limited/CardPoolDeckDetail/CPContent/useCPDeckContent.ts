import { useCardPoolDeckDetailStore } from '@/components/app/limited/CardPoolDeckDetail/useCardPoolDeckDetailStore.ts';
import { useGetCardPoolDeckCards } from '@/api/card-pools';
import { useCardList } from '@/api/lists/useCardList.ts';
import {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../../lib/swu-resources/types.ts';
import { useCPLeaderBaseAspects } from '@/components/app/limited/CardPoolDeckDetail/CPTopFilters/useCPLeaderBaseAspects.ts';

type ExpandedCardData = {
  cardPoolNumber: number;
  location: 'pool' | 'deck' | 'trash';
  card: CardDataWithVariants<CardListVariants>;
  cardId: string;
  filterSuccess: boolean;
};

type CardStack = { title: string; cards: ExpandedCardData[] };
type CardGroup = { title: string; cards: CardStack[] };

type CPDeckContent = {
  pool: {
    cards: ExpandedCardData[];
    boxes: CardGroup[];
  };
  deck: ExpandedCardData[];
  trash: ExpandedCardData[];
};

export function useCPDeckContent(deckId: string, poolId: string) {
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

  /*
  1. implement filter functions for `filterAspect + exactAspects`, `filterCost`, `filterType`, `filterTraits` and `filterKeywords`
  - all of them should take the `CardDataWithVariants<CardListVariants>` object and their respective filter values as arguments
  - the filter functions should return a boolean indicating whether the card should be included in the filtered list
  2. implement grouping functions:
  - the grouping functions should take the filtered list of cards and return an array of objects with "title" and "cards" properties
  - the "title" property should be the value of the "aspect" or "type" property of the card, depending on the grouping type
  - grouping by "aspect" - SwuAspect.VILLAINY, SwuAspect.HEROISM, SwuAspect.COMMAND, SwuAspect.VIGILANCE, SwuAspect.CUNNING, SwuAspect.AGGRESSION
  --- just keep in mind, that filterAspects can be "showOnlyLeaderAndBaseAspects" or "all" (which means no filter)
  --- => setting "showOnlyLeaderAndBaseAspects" implies, that this grouping function should accept an array of SwuAspects, not only one
  - grouping by "type" - "Ground", "Space", "Upgrade", "Event" (units here are divided into two types here!)
  - grouping by "cost" - 0, 1, 2, 3, 4, 5, 6 (6 is always the last one and means 6 OR MORE)
  --- just keep in mind, that filterCost is of type `Partial<Record<number | 'all', true>>;`, so multiple costs can be selected at once
  - grouping by "X" - means "All" group, just put all cards there
  3. create an array of ExpandedCardData from the data object ( that means adding
          "cardPoolNumber" (originally a key), "card" (cardId searched up in cardListData)
          and "filterSuccess" (boolean, "true" as default) properties to the original object)
  4. create a "mainPool", "deck" and "trash" arrays from the expanded data array
  - always remove cards with type "Leader" and "Base" from the arrays! they are not needed in the deck content
  - if the "showRemovedCards" is true, include also cards in "trash" in the main pool
  - if the "showCardsInDeck" is true, include also cards in "deck" in the main pool
  5. run all cards in the main pool through the filter functions (if any) and set "filterSuccess" to false for all cards that don't pass the filter
  - then, if the showUnfilteredCards is false, remove all cards that have "filterSuccess" set to false from the main pool
  6. group the remaining cards into boxes based on the
  '
   */
}
