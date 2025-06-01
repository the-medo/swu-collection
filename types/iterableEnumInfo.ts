import {
  CardLanguage,
  CardCondition,
  SwuAspect,
  CollectionType,
  DeckGroupBy,
  DeckLayout,
  ViewMode,
  DiffDisplayMode,
} from './enums.ts';

export const getLanguageFlagUrl = (language: CardLanguage) =>
  `https://images.swubase.com/flags/languages/${language}.png`;

export type LanguageInfo = {
  language: CardLanguage;
  fullName: string;
  flag: string;
};

export const languageObj: Record<CardLanguage, LanguageInfo> = {
  [CardLanguage.EN]: {
    language: CardLanguage.EN,
    fullName: 'English',
    flag: getLanguageFlagUrl(CardLanguage.EN),
  },
  [CardLanguage.DE]: {
    language: CardLanguage.DE,
    fullName: 'German',
    flag: getLanguageFlagUrl(CardLanguage.DE),
  },
  [CardLanguage.FR]: {
    language: CardLanguage.FR,
    fullName: 'French',
    flag: getLanguageFlagUrl(CardLanguage.FR),
  },
  [CardLanguage.IT]: {
    language: CardLanguage.IT,
    fullName: 'Italian',
    flag: getLanguageFlagUrl(CardLanguage.IT),
  },
  [CardLanguage.ES]: {
    language: CardLanguage.ES,
    fullName: 'Spanish',
    flag: getLanguageFlagUrl(CardLanguage.ES),
  },
};

export const languageArray: LanguageInfo[] = Object.values(languageObj);

export type CardConditionInfo = {
  condition: CardCondition;
  fullName: string;
  shortName: string;
  numericValue: number;
};

export const cardConditionObj: Record<CardCondition, CardConditionInfo> = {
  [CardCondition.MT]: {
    condition: CardCondition.MT,
    fullName: 'Mint',
    shortName: 'MT',
    numericValue: 0,
  },
  [CardCondition.NM]: {
    condition: CardCondition.NM,
    fullName: 'Near Mint',
    shortName: 'NM',
    numericValue: 1,
  },
  [CardCondition.EX]: {
    condition: CardCondition.EX,
    fullName: 'Excellent',
    shortName: 'EX',
    numericValue: 2,
  },
  [CardCondition.GD]: {
    condition: CardCondition.GD,
    fullName: 'Good',
    shortName: 'GD',
    numericValue: 3,
  },
  [CardCondition.LP]: {
    condition: CardCondition.LP,
    fullName: 'Lightly Played',
    shortName: 'LP',
    numericValue: 4,
  },
  [CardCondition.PL]: {
    condition: CardCondition.PL,
    fullName: 'Played',
    shortName: 'PL',
    numericValue: 5,
  },
  [CardCondition.PO]: {
    condition: CardCondition.PO,
    fullName: 'Poor',
    shortName: 'PO',
    numericValue: 6,
  },
};

export const cardConditionNumericObj: Record<number, CardConditionInfo | undefined> = {};
export const cardConditionArray: CardConditionInfo[] = Object.values(cardConditionObj);
cardConditionArray.forEach(
  condition => (cardConditionNumericObj[condition.numericValue] = condition),
);

export const aspectArray = [
  SwuAspect.VIGILANCE,
  SwuAspect.COMMAND,
  SwuAspect.AGGRESSION,
  SwuAspect.CUNNING,
  SwuAspect.HEROISM,
  SwuAspect.VILLAINY,
];

export const deckLayoutObj: Record<DeckLayout, { title: string }> = {
  [DeckLayout.TEXT]: {
    title: 'Text',
  },
  [DeckLayout.TEXT_CONDENSED]: {
    title: 'Text Condensed',
  },
  [DeckLayout.VISUAL_GRID]: {
    title: 'Grid',
  },
  [DeckLayout.VISUAL_GRID_OVERLAP]: {
    title: 'Grid - Overlap',
  },
  [DeckLayout.VISUAL_STACKS]: {
    title: 'Stacks',
  },
  [DeckLayout.VISUAL_STACKS_SPLIT]: {
    title: 'Stacks - Split',
  },
};

export const deckLayoutArray = Object.values(DeckLayout);

export const deckGroupByObj: Record<DeckGroupBy, { title: string }> = {
  [DeckGroupBy.CARD_TYPE]: {
    title: 'Card Type',
  },
  [DeckGroupBy.COST]: {
    title: 'Cost',
  },
  [DeckGroupBy.ASPECT]: {
    title: 'Aspect',
  },
  [DeckGroupBy.TRAIT]: {
    title: 'Trait',
  },
  [DeckGroupBy.KEYWORDS]: {
    title: 'Keywords',
  },
};

export const deckGroupByArray = Object.values(DeckGroupBy);

export const collectionTypeTitle: Record<CollectionType, string> = {
  [CollectionType.COLLECTION]: 'Collection',
  [CollectionType.WANTLIST]: 'Wantlist',
  [CollectionType.OTHER]: 'Card list',
};

// Define objects and arrays for DiffDisplayMode
export const diffDisplayModeObj: Record<DiffDisplayMode, { title: string }> = {
  [DiffDisplayMode.COUNT_AND_DIFF]: {
    title: 'Count + Diff',
  },
  [DiffDisplayMode.COUNT_ONLY]: {
    title: 'Count Only',
  },
  [DiffDisplayMode.DIFF_ONLY]: {
    title: 'Diff Only',
  },
};

export const diffDisplayModeArray = Object.values(DiffDisplayMode);

// Define objects and arrays for ViewMode
export const viewModeObj: Record<ViewMode, { title: string }> = {
  [ViewMode.ROW_CARD]: {
    title: 'Cards in Rows',
  },
  [ViewMode.ROW_DECK]: {
    title: 'Decks in Rows',
  },
};

export const viewModeArray = Object.values(ViewMode);
