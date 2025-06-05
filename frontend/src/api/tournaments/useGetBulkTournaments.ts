import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import {
  getStoredTournamentDecks,
  getStoredTournamentMatches,
  isDataStale,
  storeTournamentDecks,
  storeTournamentMatches,
} from '@/lib/db.ts';
import { TournamentDeckResponse } from './useGetTournamentDecks';
import { TournamentMatch } from '../../../../server/db/schema/tournament_match';
import { TournamentData } from '../../../../types/Tournament';

interface TournamentsBulkResponse {
  matches: Record<string, TournamentMatch[]>;
  decks: Record<string, TournamentDeckResponse[]>;
}

export const useGetBulkTournaments = (tournaments: TournamentData[] | undefined) => {
  return useQuery<{
    matches: Record<string, TournamentMatch[]>;
    decks: Record<string, TournamentDeckResponse[]>;
  }>({
    queryKey: [
      'tournaments-bulk',
      tournaments ? tournaments.map(t => t.tournament.id).join(',') : null,
    ],
    queryFn: async () => {
      if (!tournaments || tournaments.length === 0) {
        return { matches: {}, decks: {} };
      }

      // Filter out tournament IDs that already have fresh data in IndexedDB
      const idsToFetch: string[] = [];

      for (const tournamentData of tournaments) {
        const tournament = tournamentData.tournament;
        if (!tournament || !tournament.id || !tournament.updatedAt || !tournament.imported) {
          continue; // Skip tournaments without necessary data
        }

        const tournamentId = tournament.id;
        const updatedAt = tournament.updatedAt;

        // Check if data is in IndexedDB and not stale
        const cachedDecks = await getStoredTournamentDecks(tournamentId);
        const cachedMatches = await getStoredTournamentMatches(tournamentId);

        // Add to idsToFetch if either decks or matches are missing or stale
        if (
          !cachedDecks ||
          !cachedMatches ||
          isDataStale(cachedDecks.fetchedAt, updatedAt) ||
          isDataStale(cachedMatches.fetchedAt, updatedAt)
        ) {
          idsToFetch.push(tournamentId);
        }
      }

      // If no tournaments need updating, return cached data
      if (idsToFetch.length === 0) {
        const result: TournamentsBulkResponse = { matches: {}, decks: {} };

        for (const tournamentData of tournaments) {
          const tournamentId = tournamentData.tournament.id;
          if (!tournamentId || !tournamentData.tournament.imported) continue;

          const cachedDecks = await getStoredTournamentDecks(tournamentId);
          const cachedMatches = await getStoredTournamentMatches(tournamentId);

          if (cachedDecks) {
            result.decks[tournamentId] = cachedDecks.decks;
          }

          if (cachedMatches) {
            result.matches[tournamentId] = cachedMatches.matches;
          }
        }

        return result;
      }

      // Fetch data for tournaments that need updating
      const response = await api.tournament.bulk.data.$get({
        query: {
          ids: idsToFetch.join(','),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bulk tournaments data');
      }

      const data = (await response.json()) as TournamentsBulkResponse;

      // Store the fetched data in IndexedDB
      for (const tournamentId of idsToFetch) {
        if (data.decks && data.decks[tournamentId]) {
          await storeTournamentDecks(tournamentId, data.decks[tournamentId]);
        }

        if (data.matches && data.matches[tournamentId]) {
          await storeTournamentMatches(tournamentId, data.matches[tournamentId]);
        }
      }

      // Merge with any cached data for tournaments that weren't fetched
      for (const tournamentData of tournaments) {
        const tournamentId = tournamentData.tournament.id;
        if (
          !tournamentId ||
          !tournamentData.tournament.imported ||
          idsToFetch.includes(tournamentId)
        ) {
          continue; // Skip tournaments without necessary data or already fetched
        }

        const cachedDecks = await getStoredTournamentDecks(tournamentId);
        const cachedMatches = await getStoredTournamentMatches(tournamentId);

        if (cachedDecks) {
          if (!data.decks) data.decks = {};
          data.decks[tournamentId] = cachedDecks.decks;
        }

        if (cachedMatches) {
          if (!data.matches) data.matches = {};
          data.matches[tournamentId] = cachedMatches.matches;
        }
      }

      return data;
    },
    enabled: tournaments !== undefined && tournaments.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
