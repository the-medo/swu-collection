import { areGameAndMatchRecordsEqual } from '@/components/app/statistics/lib/resultStatistics';
import * as React from 'react';
import { MetaInfo } from '@/components/app/tournaments/TournamentMeta/MetaInfoSelector.tsx';
import { StatisticsMetaDataItem } from '@/components/app/statistics/StatisticsMeta/statisticsMetaLib.ts';
import { StatSection } from '@/components/app/statistics/common/StatSection.tsx';
import { cn } from '@/lib/utils';

const groupingDescriptionByMetaInfo: Record<MetaInfo, string> = {
  leaders: 'opponent leader',
  leadersAndBase: 'opponent leader/base combination',
  bases: 'opponent base',
  aspects: 'opponent aspect',
  aspectsBase: 'opponent base aspect',
  aspectsDetailed: 'opponent aspect mix',
  sets: 'opponent leader set',
};

interface StatisticsMetaTooltipProps {
  item: StatisticsMetaDataItem;
  metaInfo: MetaInfo;
  totalMatches: number;
  labelRenderer: (
    value: string,
    metaInfo: MetaInfo,
    type: 'text' | 'compact' | 'image',
  ) => React.ReactNode;
}

const StatisticsMetaTooltip: React.FC<StatisticsMetaTooltipProps> = ({
  item,
  metaInfo,
  totalMatches,
  labelRenderer,
}) => {
  const percentage = totalMatches > 0 ? ((item.count / totalMatches) * 100).toFixed(1) : '0.0';
  const totalGames = item.gameWins + item.gameLosses + item.gameDraws;
  const showMatches = !areGameAndMatchRecordsEqual({
    ...item,
    totalGames,
    totalMatches: item.wins + item.losses + item.draws,
    matchWins: item.wins,
    matchLosses: item.losses,
  });
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

      <div className={cn('grid w-full max-w-2xl gap-3', showMatches && 'md:grid-cols-2')}>
        {showMatches && (
          <div className="flex flex-col items-center gap-2">
            <StatSection
              label="Matches"
              total={item.count}
              wins={item.wins}
              losses={item.losses}
              draws={item.draws}
              winrate={matchWinRate}
            />
          </div>
        )}
        <div className="flex flex-col items-center gap-2">
          <StatSection
            label="Games"
            total={totalGames}
            wins={item.gameWins}
            losses={item.gameLosses}
            draws={item.gameDraws}
            winrate={gameWinRate}
          />
        </div>
      </div>

      <div className="w-full max-w-2xl rounded-lg border bg-muted/30 p-3 text-left text-sm text-muted-foreground">
        Count shows how many filtered matches were played against this{' '}
        {groupingDescriptionByMetaInfo[metaInfo]}. Match and game records are shown from the grouped
        opponent&apos;s point of view.
      </div>
    </div>
  );
};

export default StatisticsMetaTooltip;
