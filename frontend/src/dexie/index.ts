// Re-export database instance and class
export { db, SwuBaseDB } from './db';

// Re-export tournament functionality
export {
  type TournamentDecksStore,
  type TournamentMatchesStore,
  getStoredTournamentDecks,
  storeTournamentDecks,
  getStoredTournamentMatches,
  storeTournamentMatches,
  isDataStale,
} from './tournament';

// Re-export card prices functionality
export {
  type CardVariantPriceStore,
  type CardVariantPriceFetchListStore,
  createCardVariantPriceId,
  createCardVariantFetchListId,
  getStoredCardVariantPrice,
  storeCardVariantPrice,
  getStoredCardVariantPricesByCard,
  addToCardVariantPriceFetchList,
  removeFromCardVariantPriceFetchList,
  getCardVariantPriceFetchList,
  isInCardVariantPriceFetchList,
  clearCardVariantPriceFetchList,
  isCardVariantPriceDataStale,
  batchStoreCardVariantPrices,
  batchAddToCardVariantPriceFetchList,
} from './cardPrices';

// Daily snapshots exports
export {
  type DailySnapshotDay,
  getSectionsFromDate,
  addSectionToDate,
  getAvailableSectionsWithUpdatedAt,
  getSectionData,
} from './dailySnapshots';

// Game results exports
export {
  type GameResultStore,
  getGameResultsByScope,
  getGameResultsByScopeAndDateRange,
  getGameResultsByScopeAndDeck,
  getGameResultsByScopeAndFormat,
  getGameResultsByScopeAndLeader,
  getGameResultsByScopeLeaderAndBase,
  getGameResultById,
  storeGameResult,
  storeGameResults,
  deleteGameResult,
  deleteGameResultsByScope,
  getLatestUpdatedAtForScope,
} from './gameResults';

// Export auto-fetch prices hook
export { useAutofetchPrices } from '../components/app/card-prices/useAutofetchPrices.ts';

// Export PriceFetcher component
export { PriceFetcher } from '../components/app/card-prices/PriceFetcher.tsx';
