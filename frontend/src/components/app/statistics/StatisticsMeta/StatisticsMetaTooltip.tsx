import * as React from 'react';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { StatisticsMetaDataItem } from '@/components/app/statistics/StatisticsMeta/statisticsMetaLib.ts';

const metaInfo: MetaInfo = 'leadersAndBase';

interface StatisticsMetaTooltipProps {
  item: StatisticsMetaDataItem;
  totalMatches: number;
  labelRenderer: (
    value: string,
    metaInfo: MetaInfo,
    type: 'text' | 'compact' | 'image',
  ) => React.ReactNode;
}

const formatRecord = (wins: number, losses: number, draws = 0) => {
  return draws > 0 ? `${wins}-${losses}-${draws}` : `${wins}-${losses}`;
};

const StatisticsMetaTooltip: React.FC<StatisticsMetaTooltipProps> = ({
  item,
  totalMatches,
  labelRenderer,
}) => {
  const percentage = totalMatches > 0 ? ((item.count / totalMatches) * 100).toFixed(1) : '0.0';
  const totalGames = item.gameWins + item.gameLosses;
  const matchWinRate = item.count > 0 ? ((item.wins / item.count) * 100).toFixed(1) : '0.0';
  const gameWinRate = totalGames > 0 ? ((item.gameWins / totalGames) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-4 flex flex-col items-center text-center">
      <div className="flex justify-center">{labelRenderer(item.key, metaInfo, 'image')}</div>

      <div className="flex gap-2 items-center justify-center flex-wrap">
        <div className="rounded-full p-4 flex items-center justify-center size-[50px] border text-xl font-medium bg-accent">
          {item.count}
        </div>
        <div className="text-lg">/</div>
        <div className="text-lg">{totalMatches}</div>
        <div className="text-lg italic">({percentage}%)</div>
      </div>

      <div className="grid w-full max-w-md grid-cols-2 gap-2 text-left">
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="text-xs text-muted-foreground">Match record</div>
          <div className="font-medium">{formatRecord(item.wins, item.losses, item.draws)}</div>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="text-xs text-muted-foreground">Game record</div>
          <div className="font-medium">{formatRecord(item.gameWins, item.gameLosses)}</div>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="text-xs text-muted-foreground">Match win rate</div>
          <div className="font-medium">{matchWinRate}%</div>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="text-xs text-muted-foreground">Game win rate</div>
          <div className="font-medium">{gameWinRate}%</div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsMetaTooltip;
