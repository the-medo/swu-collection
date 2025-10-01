import cardListData from './json/card-list.json';
import countryData from './json/country-list.ts';
import currencyData from './json/currency-list.ts';
import type { CardsBySetAndNumber } from '../../frontend/src/api/lists/useCardList.ts';
import type { CardList } from '../../lib/swu-resources/types.ts';

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

const validVariantNames: Record<string, true | undefined> = {
  Standard: true,
  Hyperspace: true,
  'Standard Foil': true,
  'Hyperspace Foil': true,
  Showcase: true,
};

export const cardsBySetAndNumber: CardsBySetAndNumber = {};
Object.keys(cardList).forEach(cid => {
  const card = cardList[cid];
  const variantIds = Object.keys(card?.variants ?? {});
  const type = card?.type ?? 'Unknown';

  variantIds.forEach(vid => {
    const v = card?.variants[vid];
    if (v && v.baseSet && validVariantNames[v.variantName]) {
      if (!cardsBySetAndNumber[v.set]) cardsBySetAndNumber[v.set] = {};
      cardsBySetAndNumber[v.set]![v.cardNo] = {
        variant: v,
        cardId: cid,
      };
    }
  });
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
