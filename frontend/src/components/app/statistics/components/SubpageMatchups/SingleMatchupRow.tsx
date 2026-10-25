import * as React from 'react';
import { MatchupResult } from '@/components/app/statistics/lib/useAnalyzeMatchups.ts';
import { StatisticsDeckArtwork } from '@/components/app/statistics/common/StatisticsDeckArtwork.tsx';
import { StatSection } from '@/components/app/statistics/common/StatSection.tsx';

interface SingleMatchupRowProps {
  opponentDeckKey: string;
  result: MatchupResult;
}

const SingleMatchupRow: React.FC<SingleMatchupRowProps> = ({ opponentDeckKey, result }) => {
  const [leaderCardId, baseCardKey] = opponentDeckKey.split('|');

  const matchWinrate = result.total > 0 ? (result.wins / result.total) * 100 : 0;
  const gameWinrate = result.gameTotal > 0 ? (result.gameWins / result.gameTotal) * 100 : 0;

  return (
    <tr className="border-b last:border-0 hover:bg-muted/50 transition-colors">
      <td className="px-4 py-3">
        <StatisticsDeckArtwork leaderId={leaderCardId} baseKey={baseCardKey} />
      </td>
      <td className="py-3 px-4 text-center">
        <div className="flex flex-col">
          <StatSection
            variant="horizontal"
            total={result.total}
            wins={result.wins}
            losses={result.losses}
            draws={result.draws}
            winrate={matchWinrate}
            percentageVariant="horizontal"
          />
        </div>
      </td>
      <td className="py-3 px-4 text-center">
        <div className="flex flex-col">
          <StatSection
            variant="horizontal"
            total={result.gameTotal}
            wins={result.gameWins}
            losses={result.gameLosses}
            winrate={gameWinrate}
            percentageVariant="horizontal"
          />
        </div>
      </td>
    </tr>
  );
};

export default SingleMatchupRow;
