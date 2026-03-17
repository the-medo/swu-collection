import * as React from 'react';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { StatisticsMetaDataItem } from '@/components/app/statistics/StatisticsMeta/statisticsMetaLib.ts';
import { StatSection } from '@/components/app/statistics/common/StatSection.tsx';

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

const StatisticsMetaTooltip: React.FC<StatisticsMetaTooltipProps> = ({
  item,
  totalMatches,
  labelRenderer,
}) => {
  const percentage = totalMatches > 0 ? ((item.count / totalMatches) * 100).toFixed(1) : '0.0';
  const totalGames = item.gameWins + item.gameLosses;
  const matchWinRate = item.count > 0 ? (item.wins / item.count) * 100 : 0;
  const gameWinRate = totalGames > 0 ? (item.gameWins / totalGames) * 100 : 0;

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

      <div className="grid w-full max-w-2xl gap-3 md:grid-cols-2">
        <div className="flex flex-col items-center gap-2">
          <StatSection
            label="Matches"
            total={item.count}
            wins={item.wins}
            losses={item.losses}
            winrate={matchWinRate}
          />
          {item.draws > 0 && (
            <span className="text-xs text-muted-foreground">Draws: {item.draws}</span>
          )}
        </div>
        <div className="flex flex-col items-center gap-2">
          <StatSection
            label="Games"
            total={totalGames}
            wins={item.gameWins}
            losses={item.gameLosses}
            winrate={gameWinRate}
          />
        </div>
      </div>

      <div className="w-full max-w-2xl rounded-lg border bg-muted/30 p-3 text-left text-sm text-muted-foreground">
        Count shows how many filtered matches were played against this leader/base combination.
        Match and game records are shown from the grouped opponent&apos;s point of view.
      </div>
    </div>
  );
};

export default StatisticsMetaTooltip;
