import { CardLanguage } from './enums.ts';

export const getLanguageFlagUrl = (language: CardLanguage) =>
  `https://images.swubase.com/flags/languages/${language}.png`;

export const languageArray: { language: CardLanguage; fullName: string; flag: string }[] = [
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
