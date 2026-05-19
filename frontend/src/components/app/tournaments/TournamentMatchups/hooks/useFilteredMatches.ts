import { useMemo } from 'react';
import { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';
import { TournamentInfoMap } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { TournamentMatch } from '../../../../../../../server/db/schema/tournament_match.ts';
import { MatchFilter } from '../types';

const hasPlacementAtMost = (deck: TournamentDeckResponse | undefined | null, placement: number) =>
  deck?.tournamentDeck.placement != null && deck.tournamentDeck.placement <= placement;

const getTournamentDeckMapKey = (tournamentId: string, deckId: string) =>
  `${tournamentId}:${deckId}`;

export function useFilteredMatches(
  matches: TournamentMatch[],
  matchFilter: MatchFilter,
  minRound: number | undefined,
  minPoints: number | undefined,
  tournaments: TournamentInfoMap,
  decks: TournamentDeckResponse[],
) {
  const deckByTournamentAndId = useMemo(() => {
    const map = new Map<string, TournamentDeckResponse>();

    decks.forEach(deck => {
      map.set(
        getTournamentDeckMapKey(deck.tournamentDeck.tournamentId, deck.tournamentDeck.deckId),
        deck,
      );
    });

    return map;
  }, [decks]);

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
          const p1Deck = deckByTournamentAndId.get(
            getTournamentDeckMapKey(match.tournamentId, match.p1DeckId),
          );
          const p2Deck = match.p2DeckId
            ? deckByTournamentAndId.get(getTournamentDeckMapKey(match.tournamentId, match.p2DeckId))
            : null;

          return (
            hasPlacementAtMost(p1Deck, tournament.tournament.dayTwoPlayerCount) ||
            hasPlacementAtMost(p2Deck, tournament.tournament.dayTwoPlayerCount)
          );
        });
      case 'top8':
        return matches.filter(match => {
          const p1Deck = deckByTournamentAndId.get(
            getTournamentDeckMapKey(match.tournamentId, match.p1DeckId),
          );
          const p2Deck = match.p2DeckId
            ? deckByTournamentAndId.get(getTournamentDeckMapKey(match.tournamentId, match.p2DeckId))
            : null;

          return hasPlacementAtMost(p1Deck, 8) || hasPlacementAtMost(p2Deck, 8);
        });
      case 'custom':
        return matches.filter(match => {
          // Use default values when undefined
          const effectiveMinRound = minRound ?? 1;
          const effectiveMinPoints = minPoints ?? 0;

          const hasMinRound = match.round >= effectiveMinRound;

          // Check if either player has the minimum points
          // This is a simplification - adjust as needed
          const hasMinPoints =
            match.p1Points >= effectiveMinPoints ||
            (match.p2Points !== null && match.p2Points >= effectiveMinPoints);

          return hasMinRound && hasMinPoints;
        });
      default:
        return matches;
    }
  }, [matches, matchFilter, minRound, minPoints, tournaments, deckByTournamentAndId]);

  // We still need filtered decks for display purposes
  const filteredDecks = useMemo(() => {
    if (!decks.length) return [];

    // Get unique deck IDs from filtered matches
    const deckKeys = new Set<string>();
    filteredMatches.forEach(match => {
      deckKeys.add(getTournamentDeckMapKey(match.tournamentId, match.p1DeckId));
      if (match.p2DeckId) deckKeys.add(getTournamentDeckMapKey(match.tournamentId, match.p2DeckId));
    });

    return decks.filter(deck =>
      deckKeys.has(
        getTournamentDeckMapKey(deck.tournamentDeck.tournamentId, deck.tournamentDeck.deckId),
      ),
    );
  }, [decks, filteredMatches]);

  return { filteredMatches, filteredDecks };
}
