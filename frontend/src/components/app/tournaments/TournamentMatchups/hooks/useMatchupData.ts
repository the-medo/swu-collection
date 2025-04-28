import { useMemo, useCallback } from 'react';
import { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';
import { TournamentMatch } from '../../../../../../../server/db/schema/tournament_match.ts';
import { MatchupData } from '../types';
import { MetaInfo } from '../../TournamentMeta/MetaInfoSelector.tsx';
import { getBaseKey } from '../utils/getBaseKey';

export function useMatchupData(
  filteredMatches: TournamentMatch[],
  filteredDecks: TournamentDeckResponse[],
  cardListData: any,
  metaInfo: MetaInfo,
) {
  // Helper function to get key for a deck based on meta info
  const getDeckKey = useCallback(
    (deck: TournamentDeckResponse) => {
      if (!deck.deck || !cardListData) return '';

      let key = '';

      switch (metaInfo) {
        case 'leaders':
          // Use leader card IDs as key
          key = [deck.deck.leaderCardId1, deck.deck.leaderCardId2].filter(Boolean).sort().join('-');
          break;
        case 'leadersAndBase':
          // Use leader card IDs and base card ID as key
          const leaderKey = [deck.deck.leaderCardId1, deck.deck.leaderCardId2]
            .filter(Boolean)
            .sort()
            .join('-');
          const baseKeyValue = getBaseKey(
            deck.deck.baseCardId,
            deck.deckInformation?.baseAspect,
            cardListData,
          );
          key = `${leaderKey}|${baseKeyValue}`;
          break;
        case 'bases':
          key = getBaseKey(deck.deck.baseCardId, deck.deckInformation?.baseAspect, cardListData);
          break;
        case 'aspectsBase':
          // Use base aspect as key
          if (deck.deckInformation?.baseAspect) {
            key = deck.deckInformation.baseAspect;
          } else {
            key = 'no-aspect';
          }
          break;
        case 'aspects':
        case 'aspectsDetailed':
          // Create a key based on which aspects are used
          const aspects: string[] = [];
          if (deck.deckInformation?.aspectCommand)
            Array.from({ length: deck.deckInformation?.aspectCommand }).forEach(() =>
              aspects.push('Command'),
            );
          if (deck.deckInformation?.aspectVigilance)
            Array.from({ length: deck.deckInformation?.aspectVigilance }).forEach(() =>
              aspects.push('Vigilance'),
            );
          if (deck.deckInformation?.aspectAggression)
            Array.from({ length: deck.deckInformation?.aspectAggression }).forEach(() =>
              aspects.push('Aggression'),
            );
          if (deck.deckInformation?.aspectCunning)
            Array.from({ length: deck.deckInformation?.aspectCunning }).forEach(() =>
              aspects.push('Cunning'),
            );
          if (deck.deckInformation?.aspectHeroism)
            Array.from({ length: deck.deckInformation?.aspectHeroism }).forEach(() =>
              aspects.push('Heroism'),
            );
          if (deck.deckInformation?.aspectVillainy)
            Array.from({ length: deck.deckInformation?.aspectVillainy }).forEach(() =>
              aspects.push('Villainy'),
            );
          if (metaInfo === 'aspects') {
            // For 'aspects', we'll just use the first aspect as the key
            key = aspects[0] || 'no-aspect';
          } else {
            key = aspects.sort().join('-') || 'no-aspect';
          }
          break;
      }

      return key;
    },
    [cardListData, metaInfo],
  );

  // Analyze matchups using actual match data
  return useMemo(() => {
    if (!filteredMatches.length || !cardListData) return { keys: [], matchups: {} as MatchupData };

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
    const matchups: MatchupData = {};

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
    const totalStats = new Map<
      string,
      {
        totalWins: number;
        totalLosses: number;
        totalGameWins: number;
        totalGameLosses: number;
      }
    >();

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
