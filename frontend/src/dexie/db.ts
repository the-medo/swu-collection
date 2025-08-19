import Dexie, { type Table } from 'dexie';
import { type TournamentDecksStore, type TournamentMatchesStore } from './tournament';
import { type CardVariantPriceStore, type CardVariantPriceFetchListStore } from './cardPrices';
import { type UserSettingsStore } from './userSettings';

export class SwuBaseDB extends Dexie {
  // Tables
  tournamentDecks!: Table<TournamentDecksStore>;
  tournamentMatches!: Table<TournamentMatchesStore>;
  cardVariantPrices!: Table<CardVariantPriceStore>;
  cardVariantPriceFetchList!: Table<CardVariantPriceFetchListStore>;
  userSettings!: Table<UserSettingsStore>;
  dailySnapshots!: Table<import('./dailySnapshots').DailySnapshotDay>;

  constructor() {
    super('SwuBaseDB');
    this.version(1).stores({
      tournamentDecks: 'id', // Primary key is tournamentId
      tournamentMatches: 'id', // Primary key is tournamentId
    });
    
    this.version(2).stores({
      tournamentDecks: 'id', // Primary key is tournamentId
      tournamentMatches: 'id', // Primary key is tournamentId
      cardVariantPrices: 'id, cardId, variantId, sourceType, fetchedAt', // Composite key + indexes
      cardVariantPriceFetchList: 'id, cardId, variantId, addedAt', // Composite key + indexes
    });
    
    this.version(3).stores({
      tournamentDecks: 'id', // Primary key is tournamentId
      tournamentMatches: 'id', // Primary key is tournamentId
      cardVariantPrices: 'id, cardId, variantId, sourceType, fetchedAt', // Composite key + indexes
      cardVariantPriceFetchList: 'id, cardId, variantId, addedAt', // Composite key + indexes
      userSettings: 'key', // Primary key is the setting key
    });

    // v4: daily snapshots cached by date
    this.version(4).stores({
      tournamentDecks: 'id',
      tournamentMatches: 'id',
      cardVariantPrices: 'id, cardId, variantId, sourceType, fetchedAt',
      cardVariantPriceFetchList: 'id, cardId, variantId, addedAt',
      userSettings: 'key',
      dailySnapshots: 'date', // Primary key is date (YYYY-MM-DD)
    });
  }
}

// Create a db instance
export const db = new SwuBaseDB();
