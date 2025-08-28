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
      tournamentGroupExtendedInfo={tournamentGroupExtendedInfo}
      className={className}
    >
      <div className="text-sm">
        This section shows the meta share over the last two weeks. You can switch between total
        decks, Top 8, and winners, and choose how decks are grouped (by leader, base, or archetype).
        The table below lists the tournament group(s) that provided the data and how complete the
        data is.
      </div>
    </SectionInfoTooltip>
  );
};

export default MetaShareTwoWeeksInfoTooltip;
