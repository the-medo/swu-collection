export enum CardPriceSourceType {
  CARDMARKET = 'cardmarket',
  TCGPLAYER = 'tcgplayer',
  SWUBASE = 'swubase',
}

export type CardPriceSourceInfo = {
  id: CardPriceSourceType;
  name: string;
  logo: string;
  enabled: boolean;
  description: string;
};

export const cardPriceSourceInfo: Record<CardPriceSourceType, CardPriceSourceInfo> = {
  [CardPriceSourceType.CARDMARKET]: {
    id: CardPriceSourceType.CARDMARKET,
    name: 'CardMarket',
    logo: 'https://images.swubase.com/price-source-thumbnails/price-source-cardmarket.png',
    enabled: true,
    description: '',
  },
  [CardPriceSourceType.TCGPLAYER]: {
    id: CardPriceSourceType.TCGPLAYER,
    name: 'TCGPlayer',
    logo: 'https://images.swubase.com/price-source-thumbnails/price-source-tcgplayer.svg',
    enabled: false,
    description: 'TBD',
  },
  [CardPriceSourceType.SWUBASE]: {
    id: CardPriceSourceType.SWUBASE,
    name: 'SWU Base',
    logo: 'https://images.swubase.com/price-source-thumbnails/price-source-swubase.svg',
    enabled: false,
    description: 'TBD',
  },
};

// Interface for raw pricing object from CardMarket
export interface CardMarketPricingObject {
  idProduct: number;
  idCategory: number;
  avg: number | null;
  low: number | null;
  trend: number | null;
  avg1: number | null;
  avg7: number | null;
  avg30: number | null;
  'avg-foil': number | null;
  'low-foil': number | null;
  'trend-foil': number | null;
  'avg1-foil': number | null;
  'avg7-foil': number | null;
  'avg30-foil': number | null;
}

// Interface for raw data from CardMarket
export interface CardMarketRawData {
  version: number;
  createdAt: string;
  priceGuides: CardMarketPricingObject[];
}

// Interface for our parsed pricing object
export interface ParsedPricingObject {
  avg: number | null;
  low: number | null;
  trend: number | null;
  avg1: number | null;
  avg7: number | null;
  avg30: number | null;
}

export interface CardMarketPriceData {
  fromPrice: number;
  priceTrend: number;
  averagePrice30Days: number;
  averagePrice7Days: number;
  averagePrice1Day: number;
  averagePrice: number;
}
