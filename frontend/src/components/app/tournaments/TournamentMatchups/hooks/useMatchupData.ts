import { useMemo, useCallback } from 'react';
import { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';
import { TournamentMatch } from '../../../../../../../server/db/schema/tournament_match.ts';
import { MatchupDataMap, MatchupTotalData } from '../types';
import { MetaInfo } from '../../TournamentMeta/MetaInfoSelector.tsx';
import { getDeckKey as getDeckKeyBasedOnMetaInfo } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';

export function useMatchupData(
  filteredMatches: TournamentMatch[],
  filteredDecks: TournamentDeckResponse[],
  cardListData: any,
  metaInfo: MetaInfo,
) {
  // Helper function to get key for a deck based on meta info
  const getDeckKey = useCallback(
    (deck: TournamentDeckResponse) => getDeckKeyBasedOnMetaInfo(deck, metaInfo, cardListData),
    [cardListData, metaInfo],
  );

  // Analyze matchups using actual match data
  return useMemo(() => {
    if (!filteredMatches.length || !cardListData)
      return { keys: [], matchups: {} as MatchupDataMap };

    // Get all unique deck keys
    const deckKeys = new Set<string>();
    const deckMap = new Map<string, TournamentDeckResponse>(); // Map deck ID to deck object

    // Build a map of deck IDs to deck objects for quick lookup
    filteredDecks.forEach(deck => {
      if (deck.deck?.id) {
        deckMap.set(deck.deck.id, deck);
      }
    });

    // Get all unique deck keys from the filtered matches
    filteredMatches.forEach(match => {
      const p1Deck = deckMap.get(match.p1DeckId);
      const p2Deck = match.p2DeckId ? deckMap.get(match.p2DeckId) : undefined;

      if (p1Deck) {
        const key = getDeckKey(p1Deck);
        if (key) deckKeys.add(key);
      }

      if (p2Deck) {
        const key = getDeckKey(p2Deck);
        if (key) deckKeys.add(key);
      }
    });

    // Create a map to store matchup data
    const matchups: MatchupDataMap = {};

    // Initialize matchup data
    Array.from(deckKeys).forEach(key1 => {
      matchups[key1] = {};
      Array.from(deckKeys).forEach(key2 => {
        if (key1 !== key2) {
          // Ignore mirror matches
          matchups[key1][key2] = { wins: 0, losses: 0, gameWins: 0, gameLosses: 0 };
        }
      });
    });

    // Analyze each match to count wins and losses between deck types
    filteredMatches.forEach(match => {
      // Skip BYE matches
      if (match.isBye || !match.p2DeckId) return;

      const p1Deck = deckMap.get(match.p1DeckId);
      const p2Deck = deckMap.get(match.p2DeckId);

      if (!p1Deck || !p2Deck) return;

      const p1Key = getDeckKey(p1Deck);
      const p2Key = getDeckKey(p2Deck);

      if (!p1Key || !p2Key || p1Key === p2Key) return; // Skip if keys are missing or it's a mirror match

      // Determine the winner based on the result
      // result: 0 if lose, 1 if draw, 3 if win
      if (match.result === 3) {
        // Player 1 won
        matchups[p1Key][p2Key].wins += 1;
        matchups[p2Key][p1Key].losses += 1;
      } else if (match.result === 0) {
        // Player 1 lost
        matchups[p1Key][p2Key].losses += 1;
        matchups[p2Key][p1Key].wins += 1;
      }

      // Draws are not counted in win/loss of matches, but in games it is 1-1
      // We assume that players drew after 1-1 and not 0-0
      if (match.gameDraw === 3) {
        match.gameWin = 1;
        match.gameLose = 1;
      }

      // Track game wins and losses
      if (match.gameWin > 0 || match.gameLose > 0) {
        matchups[p1Key][p2Key].gameWins += match.gameWin;
        matchups[p1Key][p2Key].gameLosses += match.gameLose;
        matchups[p2Key][p1Key].gameWins += match.gameLose;
        matchups[p2Key][p1Key].gameLosses += match.gameWin;
      }
    });

    // Calculate total match count and win/loss stats for each deck type
    const matchCounts = new Map<string, number>();
    const totalStats = new Map<string, MatchupTotalData>();

    // Count total matches and calculate total wins/losses for each deck type
    Array.from(deckKeys).forEach(key => {
      let totalMatches = 0;
      let totalWins = 0;
      let totalLosses = 0;
      let totalGameWins = 0;
      let totalGameLosses = 0;

      // Sum up all wins and losses for this deck type
      Array.from(deckKeys).forEach(otherKey => {
        if (key !== otherKey) {
          const winsLosses = matchups[key][otherKey];
          totalMatches += winsLosses.wins + winsLosses.losses;
          totalWins += winsLosses.wins;
          totalLosses += winsLosses.losses;
          totalGameWins += winsLosses.gameWins;
          totalGameLosses += winsLosses.gameLosses;
        }
      });

      matchCounts.set(key, totalMatches);
      totalStats.set(key, { totalWins, totalLosses, totalGameWins, totalGameLosses });
    });

    // Sort keys by total match count (descending)
    const sortedKeys = Array.from(deckKeys).sort((a, b) => {
      return (matchCounts.get(b) || 0) - (matchCounts.get(a) || 0);
    });

    return {
      keys: sortedKeys,
      matchups,
      totalStats,
    };
  }, [filteredMatches, filteredDecks, cardListData, getDeckKey]);
}
