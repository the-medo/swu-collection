export enum CardPriceSourceType {
  CARDMARKET = 'cardmarket',
  TCGPLAYER = 'tcgplayer',
  SWUBASE = 'swubase',
}

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
