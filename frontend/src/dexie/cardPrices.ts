import { db } from './db';
import { queryClient } from '@/queryClient.ts';

// Card variant price interfaces
export interface CardVariantPriceStore {
  id: string; // composite key: variantId-sourceType
  cardId: string;
  variantId: string;
  sourceType: string;
  sourceLink: string;
  updatedAt: Date | null;
  data: string | null; // JSON as string
  price: string | null; // numeric as string to preserve precision
  fetchedAt: Date; // when this data was fetched from server
}

export interface CardVariantPriceFetchListStore {
  id: string; // composite key: variantId
  cardId: string;
  variantId: string;
  addedAt: Date | null; // nullable datetime when added to list
}

// Helper functions for card variant prices
export function createCardVariantPriceId(variantId: string, sourceType: string): string {
  return `${variantId}-${sourceType}`;
}

export function createCardVariantFetchListId(variantId: string): string {
  return `${variantId}`;
}

export async function getStoredCardVariantPrice(
  cardId: string,
  variantId: string,
  sourceType: string,
): Promise<CardVariantPriceStore | undefined> {
  const id = createCardVariantPriceId(variantId, sourceType);
  const result = await db.cardVariantPrices.get(id);
  if (!result) {
    await addToCardVariantPriceFetchList(cardId, variantId, sourceType);
    return undefined;
  }

  // Check if the fetchedAt property is more than 12 hours ago
  const now = new Date();

  // just for testing purposes
  /*const ageInMinutes = (now.getTime() - result.fetchedAt.getTime()) / (1000 * 60);
  if (ageInMinutes > 1) {
    await addToCardVariantPriceFetchList(cardId, variantId);
  }*/

  const ageInHours = (now.getTime() - result.fetchedAt.getTime()) / (1000 * 60 * 60);
  if (ageInHours > 12) {
    // If data is stale (more than 12 hours old), add to fetch list anyway
    await addToCardVariantPriceFetchList(cardId, variantId, sourceType);
  }

  return result;
}

export async function storeCardVariantPrice(
  cardId: string,
  variantId: string,
  sourceType: string,
  sourceLink: string,
  updatedAt: Date | null,
  data: string,
  price: string,
): Promise<void> {
  const id = createCardVariantPriceId(variantId, sourceType);
  await db.cardVariantPrices.put({
    id,
    cardId,
    variantId,
    sourceType,
    sourceLink,
    updatedAt,
    data,
    price,
    fetchedAt: new Date(),
  });
}

export async function getStoredCardVariantPricesByCard(
  cardId: string,
): Promise<CardVariantPriceStore[]> {
  return await db.cardVariantPrices.where('cardId').equals(cardId).toArray();
}

// Helper functions for card variant price fetch list
export async function addToCardVariantPriceFetchList(
  cardId: string,
  variantId: string,
  sourceType: string,
  addedAt?: Date,
): Promise<void> {
  await db.cardVariantPriceFetchList.put({
    id: `${variantId}|${sourceType}`,
    cardId,
    variantId,
    addedAt: addedAt || new Date(),
  });
}

export async function removeFromCardVariantPriceFetchList(
  variantId: string,
  sourceType: string,
): Promise<void> {
  await db.cardVariantPriceFetchList.delete(`${variantId}|${sourceType}`);
}

export async function getCardVariantPriceFetchList(): Promise<CardVariantPriceFetchListStore[]> {
  const items = await db.cardVariantPriceFetchList.toArray();
  return items.sort((a, b) => {
    if (!a.addedAt && !b.addedAt) return 0;
    if (!a.addedAt) return 1;
    if (!b.addedAt) return -1;
    return a.addedAt.getTime() - b.addedAt.getTime();
  });
}

export async function isInCardVariantPriceFetchList(
  variantId: string,
  sourceType: string,
): Promise<boolean> {
  const item = await db.cardVariantPriceFetchList.get(`${variantId}|${sourceType}`);
  return !!item;
}

export async function clearCardVariantPriceFetchList(): Promise<void> {
  await db.cardVariantPriceFetchList.clear();
}

// Utility functions for data freshness and batch operations
export function isCardVariantPriceDataStale(fetchedAt: Date, maxAgeMinutes: number = 30): boolean {
  const now = new Date();
  const ageInMinutes = (now.getTime() - fetchedAt.getTime()) / (1000 * 60);
  return ageInMinutes > maxAgeMinutes;
}

export async function batchStoreCardVariantPrices(
  prices: Array<{
    cardId: string;
    variantId: string;
    sourceType: string;
    sourceLink: string;
    updatedAt: Date | null;
    data: string | null;
    price: string | null;
  }>,
): Promise<void> {
  const items = prices.map(price => ({
    id: createCardVariantPriceId(price.variantId, price.sourceType),
    ...price,
    fetchedAt: new Date(),
  }));

  await db.cardVariantPrices.bulkPut(items);

  // Remove the fetched variants from the fetch list
  const variantIds = prices.map(price => `${price.variantId}|${price.sourceType}`);
  if (variantIds.length > 0) {
    await db.cardVariantPriceFetchList.bulkDelete(variantIds);
  }

  // Invalidate cache for each item to ensure useGetSingleCardPrice hook fetch fresh data
  // TODO - maybe update instead of invalidate?
  for (const price of prices) {
    queryClient.invalidateQueries({
      queryKey: ['single-card-price', price.variantId, price.sourceType],
      // exact: false,
    });
  }
}

export async function batchAddToCardVariantPriceFetchList(
  cardVariants: Array<{ cardId: string; variantId: string; addedAt?: Date }>,
  sourceType: string,
): Promise<void> {
  const items = cardVariants.map(variant => ({
    id: `${variant.variantId}|${sourceType}`,
    cardId: variant.cardId,
    variantId: variant.variantId,
    addedAt: variant.addedAt || new Date(),
  }));

  await db.cardVariantPriceFetchList.bulkPut(items);
}

/*
 * RECOMMENDATIONS AND IMPLEMENTATION NOTES:
 *
 * 1. USAGE PATTERN:
 *    - Check if price data exists and is fresh using isCardVariantPriceDataStale()
 *    - If stale or missing, add to fetch list using addToCardVariantPriceFetchList()
 *    - Periodically batch fetch from server using getCardVariantPriceFetchList()
 *    - Store results using batchStoreCardVariantPrices()
 *    - Clear fetch list after successful batch fetch
 *
 * 2. INDEXING STRATEGY:
 *    - Primary keys use composite strings (variantId-sourceType for prices, variantId for fetch list)
 *    - Additional indexes on cardId, variantId, sourceType for efficient queries
 *    - Consider adding compound indexes if query patterns become complex
 *
 * 3. DATA MANAGEMENT:
 *    - Consider implementing size limits for IndexedDB storage
 *    - Monitor storage quota usage in production
 *    - Current prices are kept fresh, no historical data stored
 *
 * 4. POTENTIAL ISSUES:
 *    - IndexedDB has storage limits (~50MB-1GB depending on browser/device)
 *    - Composite key strings might become long - consider hashing for very long IDs
 *    - Browser compatibility: IndexedDB works in all modern browsers but has quirks
 *    - Transaction conflicts possible with concurrent reads/writes
 *
 * 5. PERFORMANCE CONSIDERATIONS:
 *    - Use batch operations (bulkPut, bulkDelete) for better performance
 *    - Avoid frequent small transactions
 *    - Consider implementing connection pooling for high-frequency operations
 *    - Use indexes wisely - too many can slow down writes
 *
 * 6. ERROR HANDLING:
 *    - Implement try-catch blocks around IndexedDB operations
 *    - Handle quota exceeded errors gracefully
 *    - Consider fallback to memory storage if IndexedDB fails
 *    - Log errors for debugging but don't expose sensitive data
 *
 * 7. ADDITIONAL FEATURES TO CONSIDER:
 *    - Implement data compression for large JSON strings
 *    - Add data validation before storing
 *    - Implement cache invalidation strategies
 *    - Add metrics/analytics for cache hit rates
 *    - Consider implementing data synchronization conflict resolution
 */
