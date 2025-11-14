import { CardPoolStackItem } from '@/components/app/limited/CardPoolDetail/CardPoolStack.tsx';
import { SwuAspect } from '../../../../../types/enums.ts';

export type CardsBySubAspect = {
  base: CardPoolStackItem[];
  [SwuAspect.HEROISM]: CardPoolStackItem[];
  [SwuAspect.VILLAINY]: CardPoolStackItem[];
};

export type CardPoolColumns = {
  [SwuAspect.VIGILANCE]: CardsBySubAspect;
  [SwuAspect.AGGRESSION]: CardsBySubAspect;
  [SwuAspect.COMMAND]: CardsBySubAspect;
  [SwuAspect.CUNNING]: CardsBySubAspect;
  [SwuAspect.HEROISM]: CardPoolStackItem[];
  [SwuAspect.VILLAINY]: CardPoolStackItem[];
  ['no-aspect']: CardPoolStackItem[];
};

type MainAspect =
  | SwuAspect.VIGILANCE
  | SwuAspect.AGGRESSION
  | SwuAspect.COMMAND
  | SwuAspect.CUNNING;

const getEmptyCardsBySubAspect = (): CardsBySubAspect => ({
  base: [],
  [SwuAspect.HEROISM]: [],
  [SwuAspect.VILLAINY]: [],
});

const processMainAspect = (data: CardPoolColumns, c: CardPoolStackItem, aspect: MainAspect) => {
  if (c.card.aspectMap[aspect]) {
    if (c.card.aspectMap[SwuAspect.HEROISM]) {
      data[aspect][SwuAspect.HEROISM].push(c);
    } else if (c.card.aspectMap[SwuAspect.VILLAINY]) {
      data[aspect][SwuAspect.VILLAINY].push(c);
    } else {
      data[aspect]['base'].push(c);
    }
  }
};

const processSecondaryAspects = (data: CardPoolColumns, c: CardPoolStackItem) => {
  if (
    !c.card.aspectMap[SwuAspect.VIGILANCE] &&
    !c.card.aspectMap[SwuAspect.AGGRESSION] &&
    !c.card.aspectMap[SwuAspect.COMMAND] &&
    !c.card.aspectMap[SwuAspect.CUNNING]
  ) {
    if (c.card.aspectMap[SwuAspect.HEROISM]) {
      data[SwuAspect.HEROISM].push(c);
    } else if (c.card.aspectMap[SwuAspect.VILLAINY]) {
      data[SwuAspect.VILLAINY].push(c);
    } else {
      data['no-aspect'].push(c);
    }
  }
};

export const cardPoolStackCostSorter = (a: CardPoolStackItem, b: CardPoolStackItem) => {
  const aCost = a.card.cost;
  const bCost = b.card.cost;
  return (aCost ?? 0) - (bCost ?? 0);
};

export const groupToCardPoolColumns = (cards: CardPoolStackItem[]): CardPoolColumns => {
  const data: CardPoolColumns = {
    [SwuAspect.VIGILANCE]: getEmptyCardsBySubAspect(),
    [SwuAspect.AGGRESSION]: getEmptyCardsBySubAspect(),
    [SwuAspect.COMMAND]: getEmptyCardsBySubAspect(),
    [SwuAspect.CUNNING]: getEmptyCardsBySubAspect(),
    [SwuAspect.HEROISM]: [],
    [SwuAspect.VILLAINY]: [],
    ['no-aspect']: [],
  };

  cards.sort(cardPoolStackCostSorter);

  cards.forEach(c => {
    processMainAspect(data, c, SwuAspect.VIGILANCE);
    processMainAspect(data, c, SwuAspect.AGGRESSION);
    processMainAspect(data, c, SwuAspect.COMMAND);
    processMainAspect(data, c, SwuAspect.CUNNING);
    processSecondaryAspects(data, c);
  });

  return data;
};
