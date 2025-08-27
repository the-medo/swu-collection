import * as React from 'react';
import { useState, useMemo } from 'react';
import MetaDetailLinks from './MetaShareTwoWeeks/MetaDetailLinks.tsx';
import type {
  DailySnapshotSectionData,
  SectionMetaShare2Weeks,
} from '../../../../../../types/DailySnapshots.ts';
import MetaPartSelector, {
  type DailySnapshotMetaPart,
} from './MetaShareTwoWeeks/MetaPartSelector.tsx';
import MetaViewSelector, {
  type DailySnapshotMetaView,
} from './MetaShareTwoWeeks/MetaViewSelector.tsx';
import MetaSharePieChart from './MetaShareTwoWeeks/MetaSharePieChart.tsx';
import MetaShareTable from './MetaShareTwoWeeks/MetaShareTable.tsx';
import { getDeckKey2 } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { useCardList } from '@/api/lists/useCardList.ts';

export interface MetaShareTwoWeeksProps {
  payload: DailySnapshotSectionData<SectionMetaShare2Weeks>;
}

const fixedKeys = ['unknown', 'others'];

const MetaShareTwoWeeks: React.FC<MetaShareTwoWeeksProps> = ({ payload }) => {
  const [metaPart, setMetaPart] = useState<DailySnapshotMetaPart>('total');
  const [metaView, setMetaView] = useState<DailySnapshotMetaView>('leaders');
  const { data: cardListData } = useCardList();

  console.log({ payload });

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
    <div className="h-full w-full flex flex-col gap-2">
      <div className="flex gap-2 justify-between items-center">
        <h3>Meta share (last 2 weeks)</h3>
        <div className="flex gap-2 justify-start items-center">
          <MetaPartSelector value={metaPart} onChange={setMetaPart} />
          <div className="w-1 h-full border-r" />
          <MetaViewSelector value={metaView} onChange={setMetaView} />
        </div>
      </div>
      <div className="flex gap-2 justify-around flex-wrap">
        {/* Center - Pie Chart */}
        <div className="flex flex-col">
          <div className="flex-1"></div>
          <MetaSharePieChart processedData={processedData} metaView={metaView} />
        </div>

        {/* Right side - Table */}
        <div className="flex flex-col">
          <div className="flex-1">
            <MetaShareTable processedData={processedData} metaPart={metaPart} metaView={metaView} />
          </div>
          {/* Links to more detailed info */}
          <MetaDetailLinks tournamentGroupId={payload.data.tournamentGroupId} />
        </div>
      </div>
    </div>
  );
};

export default MetaShareTwoWeeks;
