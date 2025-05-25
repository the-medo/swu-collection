import { DeckCard } from '../../../../../../../types/ZDeckCard.ts';

export type DeckComparerDeck = {
  id: string;
  name: string;
  isMain: boolean;
};

export type DeckComparerCardGroup = {
  id: string;
  label: string;
  board: number;
  cards: DeckCard[];
};

export type DeckComparerTotals = {
  mainDeckTotal: number;
  otherDeckTotals: Record<string, number>;
  allTotals: number[];
};

export type DeckComparerTotalsMap = Record<string, DeckComparerTotals | undefined>;
