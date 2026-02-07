import Dexie from 'dexie';
import { db } from './db';
import type { GameResult, GameResultOtherData } from '../../../server/db/schema/game_result';
import { CardMetrics } from '../../../shared/types/cardMetrics.ts';

// Store interface for game results in IndexedDB
// scopeId is either userId (for personal games) or teamId (for team games)
export interface GameResultStore extends Omit<GameResult, 'cardMetrics' | 'roundMetrics' | 'otherData'> {
  scopeId: string; // userId or teamId for indexing
  cardMetrics: CardMetrics;
  roundMetrics: Record<string, unknown>;
  otherData: GameResultOtherData;
}

/**
 * Get all game results for a given scope (user or team)
 */
export async function getGameResultsByScope(scopeId: string): Promise<GameResultStore[]> {
  return db.gameResults
    .where('[scopeId+updatedAt]')
    .between([scopeId, Dexie.minKey], [scopeId, Dexie.maxKey])
    .toArray();
}

/**
 * Get game results for a scope within a date range
 */
export async function getGameResultsByScopeAndDateRange(
  scopeId: string,
  datetimeFrom?: string,
  datetimeTo?: string,
): Promise<GameResultStore[]> {
  let collection;

  if (datetimeFrom && datetimeTo) {
    collection = db.gameResults
      .where('[scopeId+updatedAt]')
      .between([scopeId, datetimeFrom], [scopeId, datetimeTo], true, true);
  } else if (datetimeFrom) {
    collection = db.gameResults
      .where('[scopeId+updatedAt]')
      .between([scopeId, datetimeFrom], [scopeId, Dexie.maxKey], true, true);
  } else if (datetimeTo) {
    collection = db.gameResults
      .where('[scopeId+updatedAt]')
      .between([scopeId, Dexie.minKey], [scopeId, datetimeTo], true, true);
  } else {
    collection = db.gameResults
      .where('[scopeId+updatedAt]')
      .between([scopeId, Dexie.minKey], [scopeId, Dexie.maxKey]);
  }

  return collection.toArray();
}

/**
 * Get game results for a scope filtered by deck
 */
export async function getGameResultsByScopeAndDeck(
  scopeId: string,
  deckId: string,
): Promise<GameResultStore[]> {
  return db.gameResults.where('[scopeId+deckId]').equals([scopeId, deckId]).toArray();
}

/**
 * Get game results for a scope filtered by format
 */
export async function getGameResultsByScopeAndFormat(
  scopeId: string,
  format: string,
): Promise<GameResultStore[]> {
  return db.gameResults.where('[scopeId+format]').equals([scopeId, format]).toArray();
}

/**
 * Get game results for a scope filtered by leader
 */
export async function getGameResultsByScopeAndLeader(
  scopeId: string,
  leaderCardId: string,
): Promise<GameResultStore[]> {
  return db.gameResults.where('[scopeId+leaderCardId]').equals([scopeId, leaderCardId]).toArray();
}

/**
 * Get game results for a scope filtered by leader and base
 */
export async function getGameResultsByScopeLeaderAndBase(
  scopeId: string,
  leaderCardId: string,
  baseCardKey: string,
): Promise<GameResultStore[]> {
  return db.gameResults
    .where('[scopeId+leaderCardId+baseCardKey]')
    .equals([scopeId, leaderCardId, baseCardKey])
    .toArray();
}

/**
 * Get a single game result by ID
 */
export async function getGameResultById(id: string): Promise<GameResultStore | undefined> {
  return db.gameResults.get(id);
}

/**
 * Store a single game result (add or update)
 */
export async function storeGameResult(gameResult: GameResultStore): Promise<void> {
  await db.gameResults.put(gameResult);
}

/**
 * Store multiple game results (add or update)
 * Only updates if the incoming record has a newer updatedAt
 */
export async function storeGameResults(gameResults: GameResultStore[]): Promise<void> {
  if (gameResults.length === 0) return;

  // Get existing records by IDs
  const ids = gameResults.map(g => g.id!);
  const existingRecords = await db.gameResults.where('id').anyOf(ids).toArray();
  const existingMap = new Map(existingRecords.map(r => [r.id, r]));

  // Filter to only include records that are newer or don't exist
  const recordsToStore = gameResults.filter(newRecord => {
    const existing = existingMap.get(newRecord.id);
    if (!newRecord.updatedAt) return false;
    if (!existing) return true;
    // Compare updatedAt - only store if newer
    return !existing.updatedAt || newRecord.updatedAt > existing.updatedAt;
  });

  if (recordsToStore.length > 0) {
    await db.gameResults.bulkPut(recordsToStore);
  }
}

/**
 * Delete a game result by ID
 */
export async function deleteGameResult(id: string): Promise<void> {
  await db.gameResults.delete(id);
}

/**
 * Delete all game results for a scope
 */
export async function deleteGameResultsByScope(scopeId: string): Promise<void> {
  const results = await getGameResultsByScope(scopeId);
  const ids = results.map(r => r.id);
  await db.gameResults.bulkDelete(ids);
}

/**
 * Get the most recent updatedAt timestamp for a scope
 */
export async function getLatestUpdatedAtForScope(scopeId: string): Promise<string | null> {
  const result = await db.gameResults
    .where('[scopeId+updatedAt]')
    .between([scopeId, Dexie.minKey], [scopeId, Dexie.maxKey])
    .last();
  return result?.updatedAt ?? null;
}
