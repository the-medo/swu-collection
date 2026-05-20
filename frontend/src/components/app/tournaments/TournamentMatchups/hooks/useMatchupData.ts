import { useMemo, useCallback } from 'react';
import { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';
import { TournamentMatch } from '../../../../../../../server/db/schema/tournament_match.ts';
import { MatchupDataMap, MatchupKeyInfo, MatchupTotalData } from '../types';
import { MetaInfo } from '../../TournamentMeta/MetaInfoSelector.tsx';
import { getDeckKeys as getDeckKeyBasedOnMetaInfo } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { getAspectsFromDeckInformation } from '@/components/app/tournaments/lib/getAspectsFromDeckInformation.ts';
import type { CardListResponse } from '@/api/lists/useCardList.ts';

const getTournamentDeckMapKey = (tournamentId: string, deckId: string) =>
  `${tournamentId}:${deckId}`;

export function useMatchupData(
  filteredMatches: TournamentMatch[],
  filteredDecks: TournamentDeckResponse[],
  cardListData: CardListResponse | undefined,
  metaInfo: MetaInfo,
) {
  // Helper function to get key for a deck based on meta info
  const getDeckKeys = useCallback(
    (deck: TournamentDeckResponse) => getDeckKeyBasedOnMetaInfo(deck, metaInfo, cardListData),
    [cardListData, metaInfo],
  );

  // Analyze matchups using actual match data
  return useMemo(() => {
    if (!filteredMatches.length || !cardListData)
      return { rowKeys: [], colKeys: [], matchups: {} as MatchupDataMap, keyInfo: {} };

    // Get all unique deck keys
    const deckKeys = new Set<string>();
    const deckKeysByTournamentAndId = new Map<string, string[]>();
    const keyInfo: Record<string, MatchupKeyInfo> = {};

    // Build tournament-scoped deck keys for quick lookup
    filteredDecks.forEach(deck => {
      const deckMapKey = getTournamentDeckMapKey(
        deck.tournamentDeck.tournamentId,
        deck.tournamentDeck.deckId,
      );

      const keys = getDeckKeys(deck) ?? [];
      deckKeysByTournamentAndId.set(deckMapKey, keys);
      if (!keys.length) return;

      // Keep full aspect profiles per contributing deck so later filters can test real decks,
      // not a union of unrelated aspects across many decks with the same matchup key.
      const sourceDeckAspects = deck.deckInformation
        ? getAspectsFromDeckInformation(deck.deckInformation)
        : [];
      keys.forEach(key => {
        deckKeys.add(key);
        keyInfo[key] ??= { rawKey: key, sourceDeckAspects: [] };
        keyInfo[key].sourceDeckAspects.push(sourceDeckAspects);
      });
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

      const p1DeckMapKey = getTournamentDeckMapKey(match.tournamentId, match.p1DeckId);
      const p2DeckMapKey = getTournamentDeckMapKey(match.tournamentId, match.p2DeckId);
      const p1Keys = deckKeysByTournamentAndId.get(p1DeckMapKey) ?? [];
      const p2Keys = deckKeysByTournamentAndId.get(p2DeckMapKey) ?? [];

      if (!p1Keys.length || !p2Keys.length) return;

      p1Keys.forEach(p1Key => {
        p2Keys.forEach(p2Key => {
          if (p1Key === p2Key) return;
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

          // Draws are not counted in win/loss of matches, but in games it is 1-1.
          // We assume that players drew after 1-1 and not 0-0.
          const gameWin = match.gameDraw === 3 ? 1 : match.gameWin;
          const gameLose = match.gameDraw === 3 ? 1 : match.gameLose;

          // Track game wins and losses
          if (gameWin > 0 || gameLose > 0) {
            matchups[p1Key][p2Key].gameWins += gameWin;
            matchups[p1Key][p2Key].gameLosses += gameLose;
            matchups[p2Key][p1Key].gameWins += gameLose;
            matchups[p2Key][p1Key].gameLosses += gameWin;
          }
        });
      });
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
      rowKeys: sortedKeys,
      colKeys: sortedKeys,
      matchups,
      totalStats,
      keyInfo,
    };
  }, [filteredMatches, filteredDecks, cardListData, getDeckKeys]);
}
