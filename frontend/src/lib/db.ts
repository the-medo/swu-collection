import Dexie, { type Table } from 'dexie';
import { type TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks';
import { type TournamentMatch } from '../../../server/db/schema/tournament_match';

export interface TournamentDecksStore {
  id: string; // tournamentId
  decks: TournamentDeckResponse[];
  fetchedAt: Date;
}

export interface TournamentMatchesStore {
  id: string; // tournamentId
  matches: TournamentMatch[];
  fetchedAt: Date;
}

export class SwuBaseDB extends Dexie {
  // Tables
  tournamentDecks!: Table<TournamentDecksStore>;
  tournamentMatches!: Table<TournamentMatchesStore>;

  constructor() {
    super('SwuBaseDB');
    this.version(1).stores({
      tournamentDecks: 'id', // Primary key is tournamentId
      tournamentMatches: 'id', // Primary key is tournamentId
    });
  }
}

// Create a db instance
export const db = new SwuBaseDB();

// Helper functions for tournament data
export async function getStoredTournamentDecks(
  tournamentId: string,
): Promise<TournamentDecksStore | undefined> {
  return await db.tournamentDecks.get(tournamentId);
}

export async function storeTournamentDecks(
  tournamentId: string,
  decks: TournamentDeckResponse[],
): Promise<void> {
  await db.tournamentDecks.put({
    id: tournamentId,
    decks,
    fetchedAt: new Date(),
  });
}

export async function getStoredTournamentMatches(
  tournamentId: string,
): Promise<TournamentMatchesStore | undefined> {
  return await db.tournamentMatches.get(tournamentId);
}

export async function storeTournamentMatches(
  tournamentId: string,
  matches: TournamentMatch[],
): Promise<void> {
  await db.tournamentMatches.put({
    id: tournamentId,
    matches,
    fetchedAt: new Date(),
  });
}

// Helper to check if data is stale compared to tournament update time
export function isDataStale(fetchedAt: Date, tournamentUpdatedAt: string): boolean {
  const tournamentDate = new Date(tournamentUpdatedAt);
  return fetchedAt < tournamentDate;
}
