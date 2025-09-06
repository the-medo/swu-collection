import * as React from 'react';
import type { DailySnapshotRow } from '@/api/daily-snapshot';
import type { TournamentGroupExtendedInfo } from '../../../../../../../types/DailySnapshots.ts';
import { SectionInfoTooltip } from '../components/SectionInfoTooltip.tsx';

export interface MetaShareTwoWeeksInfoTooltipProps {
  dailySnapshot?: DailySnapshotRow | null;
  sectionUpdatedAt?: string;
  tournamentGroupExtendedInfo: TournamentGroupExtendedInfo[];
  className?: string;
}

const MetaShareTwoWeeksInfoTooltip: React.FC<MetaShareTwoWeeksInfoTooltipProps> = ({
  dailySnapshot,
  sectionUpdatedAt,
  tournamentGroupExtendedInfo,
  className,
}) => {
  return (
    <SectionInfoTooltip
      dailySnapshot={dailySnapshot}
      sectionUpdatedAt={sectionUpdatedAt}
      sectionDataWarning={true}
      tournamentGroupExtendedInfo={tournamentGroupExtendedInfo}
      className={className}
    >
      <div className="text-sm">
        This section shows the meta share over the last two weeks. You can switch between Total
        decks, Top 8, and Champions, and choose how decks are grouped (by leader or leader+base).
      </div>
      <div className="text-sm">
        Percentage in "Top 8" and "Champions" columns is{' '}
        <span className="text-green-600">green</span> if it is bigger than its own "total" meta
        share and <span className="text-red-600">red</span> if it is below.
      </div>
    </SectionInfoTooltip>
  );
};

export default MetaShareTwoWeeksInfoTooltip;
