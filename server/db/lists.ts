import type { CardList } from '../../lib/swu-resources/types.ts';
import cardListData from './json/card-list.json';
import countryData from './json/country-list.ts';
import currencyData from './json/currency-list.ts';

export type CountryCode = (typeof countryData)[number]['code'];
export type Country = {
  name: string;
  code: CountryCode;
  states: string[] | null;
  flag: string;
};
export type CountryList = Record<CountryCode, Country>;

export type CurrencyCode = (typeof currencyData)[number]['currency_code'];
export type Currency = {
  code: CurrencyCode;
  name: string;
  symbol: string;
};
export type CurrencyList = Record<CurrencyCode, Currency>;

const cardList = cardListData as unknown as CardList;
Object.entries(cardList).forEach(([cardId, card]) => {
  card?.aspects.sort((a, b) => (['Heroism', 'Villainy'].includes(a) ? 1 : -1));
});

const countryList = {} as CountryList;
countryData.forEach(p => {
  countryList[p.code] = {
    name: p.name,
    code: p.code,
    states: p.states ? [...p.states] : null,
    flag: p['flag-image'].find((i: string) => i.indexOf('small_')) ?? '',
  };
});

const currencyList = {} as CurrencyList;
currencyData.forEach(p => {
  currencyList[p.currency_code] = {
    name: p.name,
    code: p.currency_code,
    symbol: p.symbol,
  };
});

export { cardList, countryList, currencyList };
