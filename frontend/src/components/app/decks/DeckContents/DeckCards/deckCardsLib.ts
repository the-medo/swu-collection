import {
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
