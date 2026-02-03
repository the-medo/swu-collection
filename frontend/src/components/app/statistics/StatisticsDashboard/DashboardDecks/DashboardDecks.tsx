import * as React from 'react';
import { StatisticsHistoryData } from '@/components/app/statistics/useGameResults.ts';
import { useMemo } from 'react';
import DeckInfoThumbnail from './DeckInfoThumbnail.tsx';

interface DashboardDecksProps {
  byDeckId: StatisticsHistoryData['matches']['byDeckId'];
}

const RECENT_DECK_COUNT = 5;

const DashboardDecks: React.FC<DashboardDecksProps> = ({ byDeckId }) => {
  const recentDecks = useMemo(() => {
    if (!byDeckId || !byDeckId.lastPlayed) return [];

    const deckIds = Object.keys(byDeckId.lastPlayed);

    // Sort by last played date desc
    const sortedDeckIds = deckIds.sort((a, b) => {
      const dateA = new Date(byDeckId.lastPlayed[a]).getTime();
      const dateB = new Date(byDeckId.lastPlayed[b]).getTime();
      return dateB - dateA;
    });

    const recentIds = sortedDeckIds.slice(0, RECENT_DECK_COUNT);

    return recentIds.map(deckId => {
      const matches = byDeckId.matches[deckId] || [];
      const firstMatch = matches[0]; // To get leader and base

      let totalGames = 0;
      let wonGames = 0;
      let wonMatches = 0;

      matches.forEach(match => {
        if (match.result === 3) wonMatches++;

        match.games.forEach(game => {
          totalGames++;
          if (game.isWinner) wonGames++;
        });
      });

      const matchWinrate = matches.length > 0 ? (wonMatches / matches.length) * 100 : 0;
      const gameWinrate = totalGames > 0 ? (wonGames / totalGames) * 100 : 0;

      return {
        deckId,
        leaderCardId: firstMatch?.leaderCardId || '',
        baseCardKey: firstMatch?.baseCardKey || '',
        matchWinrate,
        gameWinrate,
        matchWins: wonMatches,
        matchLosses: matches.length - wonMatches,
        gameWins: wonGames,
        gameLosses: totalGames - wonGames,
      };
    });
  }, [byDeckId]);

  if (recentDecks.length === 0) return null;

  return (
    <div className="flex gap-4">
      {recentDecks.map(deck => (
        <DeckInfoThumbnail
          key={deck.deckId}
          leaderCardId={deck.leaderCardId}
          baseCardKey={deck.baseCardKey}
          matchWinrate={deck.matchWinrate}
          gameWinrate={deck.gameWinrate}
          matchWins={deck.matchWins}
          matchLosses={deck.matchLosses}
          gameWins={deck.gameWins}
          gameLosses={deck.gameLosses}
        />
      ))}
    </div>
  );
};

export default DashboardDecks;
