import type { ParsedPricingObject, CardMarketPriceData } from '../../../types/CardPrices';

/**
 * Transforms a ParsedPricingObject to CardMarketPriceData
 * 
 * @param pricingObject The parsed pricing object from CardMarket
 * @returns CardMarketPriceData object with transformed values
 */
export function transformPricingObjectToCardMarketPriceData(
  pricingObject: ParsedPricingObject
): CardMarketPriceData {
  return {
    fromPrice: pricingObject.low ?? 0,
    priceTrend: pricingObject.trend ?? 0,
    averagePrice30Days: pricingObject.avg30 ?? 0,
    averagePrice7Days: pricingObject.avg7 ?? 0,
    averagePrice1Day: pricingObject.avg1 ?? 0,
    averagePrice: pricingObject.avg ?? 0,
  };
}