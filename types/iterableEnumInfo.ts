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
};

export const cardConditionArray: CardConditionInfo[] = [
  {
    condition: CardCondition.MINT,
    fullName: 'Mint',
    shortName: 'MT',
  },
  {
    condition: CardCondition.NM,
    fullName: 'Near Mint',
    shortName: 'NM',
  },
  {
    condition: CardCondition.EX,
    fullName: 'Excellent',
    shortName: 'EX',
  },
  {
    condition: CardCondition.GD,
    fullName: 'Good',
    shortName: 'GD',
  },
  {
    condition: CardCondition.LP,
    fullName: 'Lightly Played',
    shortName: 'LP',
  },
  {
    condition: CardCondition.PL,
    fullName: 'Played',
    shortName: 'PL',
  },
  {
    condition: CardCondition.PO,
    fullName: 'Poor',
    shortName: 'PO',
  },
];
