import { groupCardsByCardType } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/groupCardsByCardType.ts';
import { groupCardsByCost } from '@/components/app/decks/DeckContents/DeckCards/lib/groupCardsByCost.ts';
import { groupCardsByAspect } from '@/components/app/decks/DeckContents/DeckCards/lib/groupCardsByAspect.ts';
import { groupCardsByAspectDetailed } from '@/components/app/decks/DeckContents/DeckCards/lib/groupCardsByAspectDetailed.ts';
import { groupCardsByTrait } from '@/components/app/decks/DeckContents/DeckCards/lib/groupCardsByTrait.ts';
import { groupCardsByKeywords } from '@/components/app/decks/DeckContents/DeckCards/lib/groupCardsByKeywords.ts';
import { DeckGroupBy } from '../../../../../../../types/enums.ts';
import { groupCardsBySet } from '@/components/app/decks/DeckContents/DeckCards/lib/groupCardsBySet.ts';
import {
  CardList,
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../../lib/swu-resources/types.ts';
import { CardGroupData } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';
import { DeckCard } from '../../../../../../../types/ZDeckCard.ts';

export type DeckCardsUsed = Record<string, CardDataWithVariants<CardListVariants> | undefined>;
export type DeckCardInBoards = Record<number, number | undefined> | undefined;
export type DeckCardsInBoards = Record<string, DeckCardInBoards>;

export type DeckCardQuantityChangeHandler = (quantity: number | undefined, board?: number) => void;

export type DeckCardsForLayout = {
  mainboardGroups: CardGroupData<DeckCard> | undefined;
  cardsByBoard: Record<number, DeckCard[]>;
  usedCards: DeckCardsUsed;
  usedCardsInBoards: DeckCardsInBoards;
};

/** Shared sorting/grouping for deck detail and embedded decklists. */
export function buildDeckCardsForLayout(
  cardList: CardList | undefined,
  deckCards: DeckCard[],
  groupBy: unknown,
  leadersAndBase: Array<CardDataWithVariants<CardListVariants> | null | undefined> = [],
): DeckCardsForLayout {
  const cardsByBoard: Record<number, DeckCard[]> = {
    1: [],
    2: [],
    3: [],
  };

  const usedCards: DeckCardsUsed = {};
  const usedCardsInBoards: DeckCardsInBoards = {};

  if (leadersAndBase[0]) usedCards[leadersAndBase[0].cardId] = leadersAndBase[0];
  if (leadersAndBase[1]) usedCards[leadersAndBase[1].cardId] = leadersAndBase[1];
  if (leadersAndBase[2]) usedCards[leadersAndBase[2].cardId] = leadersAndBase[2];

  deckCards
    .filter(dc => dc.quantity > 0)
    .forEach(c => {
      if (!c) return;
      cardsByBoard[c.board].push(c);
      if (!usedCardsInBoards[c.cardId]) usedCardsInBoards[c.cardId] = {};
      usedCardsInBoards[c.cardId]![c.board] = c.quantity;

      const card = cardList?.[c.cardId];
      usedCards[c.cardId] = card;
    });

  // Sort cards by cost within each board
  for (let i = 1; i <= 3; i++) {
    cardsByBoard[i].sort(
      (a, b) => (cardList?.[a.cardId]?.cost ?? 0) - (cardList?.[b.cardId]?.cost ?? 0),
    );
  }

  // Group cards based on the selected grouping option
  let mainboardGroups;
  if (cardList) {
    switch (groupBy) {
      case DeckGroupBy.COST:
        mainboardGroups = groupCardsByCost(cardList, cardsByBoard[1]);
        break;
      case DeckGroupBy.ASPECT:
        mainboardGroups = groupCardsByAspect(cardList, cardsByBoard[1]);
        break;
      case DeckGroupBy.ASPECT_DETAILED:
        mainboardGroups = groupCardsByAspectDetailed(cardList, cardsByBoard[1]);
        break;
      case DeckGroupBy.TRAIT:
        mainboardGroups = groupCardsByTrait(cardList, cardsByBoard[1]);
        break;
      case DeckGroupBy.KEYWORDS:
        mainboardGroups = groupCardsByKeywords(cardList, cardsByBoard[1]);
        break;
      case DeckGroupBy.SET:
        mainboardGroups = groupCardsBySet(cardList, cardsByBoard[1]);
        break;
      case DeckGroupBy.CARD_TYPE:
      default:
        mainboardGroups = groupCardsByCardType(cardList, cardsByBoard[1]);
        break;
    }
  }

  return {
    mainboardGroups,
    cardsByBoard,
    usedCards,
    usedCardsInBoards,
  };
}
