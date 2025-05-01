import * as React from 'react';
import { MetaInfo } from './MetaInfoSelector';
import MetaPercentageTable from './MetaPercentageTable/MetaPercentageTable';

export interface TournamentMetaTooltipProps {
  name: string;
  metaInfo: MetaInfo;
  labelRenderer: (
    value: string,
    metaInfo: MetaInfo,
    type: 'text' | 'compact' | 'image',
  ) => React.ReactNode;
  value?: number;
  totalDeckCountBasedOnMetaPart?: number;
  data?: {
    all: number;
    top8: number;
    day2: number;
    top64: number;
    percentageAll?: string;
    percentageTop8?: string;
    percentageDay2?: string;
    percentageTop64?: string;
    conversionTop8: string;
    conversionDay2: string;
    conversionTop64: string;
  };
  totalDecks?: number;
  day2Decks?: number;
}

const TournamentMetaTooltip: React.FC<TournamentMetaTooltipProps> = ({
  name,
  metaInfo,
  labelRenderer,
  value,
  totalDeckCountBasedOnMetaPart,
  data,
  totalDecks = 0,
  day2Decks = 0,
}) => {
  // Calculate percentage if value and totalCount are provided
  const percentage =
    value && totalDeckCountBasedOnMetaPart && totalDeckCountBasedOnMetaPart > 0
      ? (((value as number) / totalDeckCountBasedOnMetaPart) * 100).toFixed(1)
      : null;

  return (
    <div className="space-y-4 flex flex-col items-center text-center">
      <div className="flex justify-center">{labelRenderer(name, metaInfo, 'image')}</div>

      {value && totalDeckCountBasedOnMetaPart && (
        <div className="flex gap-2 items-center justify-center">
          <div className="rounded-full p-4 flex items-center justify-center size-[50px] border text-xl font-medium bg-accent">
            {value}
          </div>
          <div className="text-lg">/</div>
          <div className="text-lg">{totalDeckCountBasedOnMetaPart}</div>
          <div className="ml-4 text-lg italic">{percentage ? `(${percentage}%)` : ''}</div>
        </div>
      )}

      {data && (
        <div className="w-full flex justify-center">
          <MetaPercentageTable
            data={{
              ...data,
              percentageAll: data.percentageAll || '0.0%',
              percentageTop8: data.percentageTop8 || '0.0%',
              percentageDay2: data.percentageDay2 || '0.0%',
              percentageTop64: data.percentageTop64 || '0.0%',
            }}
            totalDecks={totalDecks}
            day2Decks={day2Decks}
          />
        </div>
      )}
    </div>
  );
};

export default TournamentMetaTooltip;
