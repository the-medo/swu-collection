import { CardLanguage, CardCondition } from './enums.ts';

export const getLanguageFlagUrl = (language: CardLanguage) =>
  `https://images.swubase.com/flags/languages/${language}.png`;

export type LanguageInfo = {
  language: CardLanguage;
  fullName: string;
  flag: string;
};

export const languageArray: LanguageInfo[] = [
  {
    language: CardLanguage.EN,
    fullName: 'English',
    flag: getLanguageFlagUrl(CardLanguage.EN),
  },
  {
    language: CardLanguage.DE,
    fullName: 'German',
    flag: getLanguageFlagUrl(CardLanguage.DE),
  },
  {
    language: CardLanguage.FR,
    fullName: 'French',
    flag: getLanguageFlagUrl(CardLanguage.FR),
  },
  {
    language: CardLanguage.IT,
    fullName: 'Italian',
    flag: getLanguageFlagUrl(CardLanguage.IT),
  },
  {
    language: CardLanguage.ES,
    fullName: 'Spanish',
    flag: getLanguageFlagUrl(CardLanguage.ES),
  },
];

export type CardConditionInfo = {
  condition: CardCondition;
  fullName: string;
  shortName: string;
  numericValue: number;
};

export const cardConditionArray: CardConditionInfo[] = [
  {
    condition: CardCondition.MT,
    fullName: 'Mint',
    shortName: 'MT',
    numericValue: 0,
  },
  {
    condition: CardCondition.NM,
    fullName: 'Near Mint',
    shortName: 'NM',
    numericValue: 1,
  },
  {
    condition: CardCondition.EX,
    fullName: 'Excellent',
    shortName: 'EX',
    numericValue: 2,
  },
  {
    condition: CardCondition.GD,
    fullName: 'Good',
    shortName: 'GD',
    numericValue: 3,
  },
  {
    condition: CardCondition.LP,
    fullName: 'Lightly Played',
    shortName: 'LP',
    numericValue: 4,
  },
  {
    condition: CardCondition.PL,
    fullName: 'Played',
    shortName: 'PL',
    numericValue: 5,
  },
  {
    condition: CardCondition.PO,
    fullName: 'Poor',
    shortName: 'PO',
    numericValue: 6,
  },
];
