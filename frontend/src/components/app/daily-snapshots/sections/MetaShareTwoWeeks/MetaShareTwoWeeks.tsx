import * as React from 'react';
import { useState, useMemo } from 'react';
import MetaPartSelector from './MetaPartSelector.tsx';
import MetaViewSelector from './MetaViewSelector.tsx';
import MetaSharePieChart from './MetaSharePieChart.tsx';
import MetaShareTable from './MetaShareTable.tsx';
import MetaShareTwoWeeksInfoTooltip from './MetaShareTwoWeeksInfoTooltip.tsx';
import MetaShareDropdownMenu from './MetaShareDropdownMenu.tsx';
import { getDeckKey2 } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { DailySnapshotRow } from '@/api/daily-snapshot';
import type { DailySnapshotMetaPart } from './MetaPartSelector.tsx';
import type { DailySnapshotMetaView } from './MetaViewSelector.tsx';
import type {
  DailySnapshotSectionData,
  SectionMetaShare2Weeks,
} from '../../../../../../../types/DailySnapshots.ts';

export interface MetaShareTwoWeeksProps {
  payload: DailySnapshotSectionData<SectionMetaShare2Weeks>;
  dailySnapshot?: DailySnapshotRow | null;
  sectionUpdatedAt?: string;
}

const fixedKeys = ['unknown', 'others'];

const MetaShareTwoWeeks: React.FC<MetaShareTwoWeeksProps> = ({
  payload,
  dailySnapshot,
  sectionUpdatedAt,
}) => {
  const [metaPart, setMetaPart] = useState<DailySnapshotMetaPart>('total');
  const [metaView, setMetaView] = useState<DailySnapshotMetaView>('leaders');
  const { data: cardListData } = useCardList();

  const tournamentGroupId = payload.data.tournamentGroupExt?.tournamentGroup.id;

  // Shared data processing logic
  const processedData = useMemo(() => {
    // Group data by appropriate key and sum statistics
    const groupedData = new Map<string, { total: number; top8: number; winners: number }>();

    payload.data.dataPoints.forEach(point => {
      const key = fixedKeys.includes(point.leaderCardId)
        ? point.leaderCardId
        : getDeckKey2(point.leaderCardId, point.baseCardId, metaView, cardListData);

      const existing = groupedData.get(key) || { total: 0, top8: 0, winners: 0 };
      groupedData.set(key, {
        total: existing.total + point.total,
        top8: existing.top8 + point.top8,
        winners: existing.winners + point.winners,
      });
    });

    // Convert to array and add keys
    const analysisData = Array.from(groupedData.entries()).map(([key, data]) => ({
      key,
      ...data,
      sortValue: metaPart === 'total' ? data.total : metaPart === 'top8' ? data.top8 : data.winners,
    }));

    // Sort by the selected meta part descending
    analysisData.sort((a, b) => (b.key === 'unknown' ? -1 : b.sortValue - a.sortValue));

    return analysisData;
  }, [payload.data.dataPoints, metaView, cardListData, metaPart]);

  return (
    <div className="h-full w-full flex flex-col gap-2 ">
      <div className="flex gap-2 justify-between items-center border-b">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h4>Meta share</h4>
            <h5>(last 2 weeks)</h5>
          </div>
          <MetaShareTwoWeeksInfoTooltip
            dailySnapshot={dailySnapshot}
            sectionUpdatedAt={sectionUpdatedAt}
            tournamentGroupExtendedInfo={
              payload.data.tournamentGroupExt ? [payload.data.tournamentGroupExt] : []
            }
          />
        </div>
        <MetaShareDropdownMenu tournamentGroupId={tournamentGroupId} />
      </div>
      <div className="flex gap-4 justify-center flex-wrap @container/meta-2-weeks">
        {/* Center - Pie Chart */}
        <div className="flex flex-1 flex-col justify-center items-center">
          <MetaSharePieChart processedData={processedData} metaView={metaView} />
        </div>

        {/* Right side - Table */}
        <div className="flex-[1_1_450px] min-w-0 max-w-full gap-4 flex-wrap justify-center">
          <div className="flex gap-2 justify-center items-center flex-wrap mb-2">
            <div className="mr-4">
              <MetaPartSelector value={metaPart} onChange={setMetaPart} />
            </div>
            <MetaViewSelector value={metaView} onChange={setMetaView} />
          </div>
          <div className="min-w-0 flex justify-center items-center">
            <MetaShareTable processedData={processedData} metaPart={metaPart} metaView={metaView} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetaShareTwoWeeks;
