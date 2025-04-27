import { useMemo } from 'react';
import { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';
import { TournamentInfoMap } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { TournamentMatch } from '../../../../../../../server/db/schema/tournament_match.ts';
import { MatchFilter } from '../types';

export function useFilteredMatches(
  matches: TournamentMatch[],
  matchFilter: MatchFilter,
  minRound: number,
  minPoints: number,
  tournaments: TournamentInfoMap,
  decks: TournamentDeckResponse[]
) {
  // Get filtered matches based on match filter
  const filteredMatches = useMemo(() => {
    if (!matches.length) return [];

    switch (matchFilter) {
      case 'all':
        return matches;
      case 'day2':
        return matches.filter(match => {
          const tournamentId = match.tournamentId;
          const tournament = tournaments[tournamentId];

          // If we don't have day two player count, we can't filter for day 2
          if (!tournament?.tournament.dayTwoPlayerCount) return false;

          // For day 2 filtering, we need to find matches where at least one player
          // made it to day 2 (has placement <= dayTwoPlayerCount)
          const p1Deck = decks.find(d => d.deck?.id === match.p1DeckId);
          const p2Deck = match.p2DeckId ? decks.find(d => d.deck?.id === match.p2DeckId) : null;

          const p1InDay2 =
            p1Deck?.tournamentDeck.placement &&
            p1Deck?.tournamentDeck.placement <= tournament.tournament.dayTwoPlayerCount;

          const p2InDay2 =
            p2Deck?.tournamentDeck.placement &&
            p2Deck?.tournamentDeck.placement <= tournament.tournament.dayTwoPlayerCount;

          return p1InDay2 || p2InDay2;
        });
      case 'custom':
        return matches.filter(match => {
          const hasMinRound = match.round >= minRound;

          // Check if either player has the minimum points
          // This is a simplification - adjust as needed
          const hasMinPoints =
            match.p1Points >= minPoints || (match.p2Points !== null && match.p2Points >= minPoints);

          return hasMinRound && hasMinPoints;
        });
      default:
        return matches;
    }
  }, [matches, matchFilter, minRound, minPoints, tournaments, decks]);

  // We still need filtered decks for display purposes
  const filteredDecks = useMemo(() => {
    if (!decks.length) return [];

    // Get unique deck IDs from filtered matches
    const deckIds = new Set<string>();
    filteredMatches.forEach(match => {
      deckIds.add(match.p1DeckId);
      if (match.p2DeckId) deckIds.add(match.p2DeckId);
    });

    return decks.filter(deck => deckIds.has(deck.deck?.id || ''));
  }, [decks, filteredMatches]);

  return { filteredMatches, filteredDecks };
}