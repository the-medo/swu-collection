import * as React from 'react';
import { DailySnapshotRow } from '@/api/daily-snapshot';
import type {
  DailySnapshotSectionData,
  SectionMostPlayedCards,
} from '../../../../../../../types/DailySnapshots.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import CardStatistic from '@/components/app/card-stats/CardStatistic/CardStatistic.tsx';
import { SectionInfoTooltip } from '../components/SectionInfoTooltip.tsx';
import { CardStatsParams } from '@/api/card-stats';
import MostPlayedCardsDropdownMenu from '@/components/app/daily-snapshots/sections/MostPlayedCards/MostPlayedCardsDropdownMenu.tsx';

export interface MostPlayedCardsProps {
  payload: DailySnapshotSectionData<SectionMostPlayedCards>;
  dailySnapshot?: DailySnapshotRow | null;
  sectionUpdatedAt?: string;
}

const MostPlayedCards: React.FC<MostPlayedCardsProps> = ({
  payload,
  dailySnapshot,
  sectionUpdatedAt,
}) => {
  const { data: cardListData } = useCardList();
  const items = payload.data.dataPoints ?? [];

  const groups = React.useMemo(
    () => (payload.data.tournamentGroupExt ? [payload.data.tournamentGroupExt] : []),
    [payload.data.tournamentGroupExt],
  );

  const cardStatParams = React.useMemo<CardStatsParams>(
    () => ({ tournamentGroupId: payload.data.tournamentGroupId }),
    [payload.data.tournamentGroupId],
  );

  return (
    <div className="h-full w-full flex flex-col gap-2">
      <div className="flex gap-2 justify-between items-center border-b">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h4>Cards in most decks</h4>
            <h5>(last 2 weeks)</h5>
          </div>
          <SectionInfoTooltip
            dailySnapshot={dailySnapshot}
            sectionUpdatedAt={sectionUpdatedAt}
            sectionDataWarning={true}
            tournamentGroupExtendedInfo={groups}
          >
            <div className="text-sm">
              Shows 5 cards that have been played in the most amount of decks in the last 2 weeks.
              That does NOT mean that it has the most copies in the decks. For that, there are more
              comprehensive card statistics that you can open.
            </div>
          </SectionInfoTooltip>
        </div>
        <MostPlayedCardsDropdownMenu />
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground">No data available</div>
      ) : (
        <div className="flex flex-row gap-2 w-full overflow-x-auto">
          {items.map((it, idx) => {
            const card = cardListData?.cards?.[it.cardId];
            if (!card) return null;
            return (
              <CardStatistic
                key={it.cardId}
                card={card}
                cardStat={it}
                cardStatParams={cardStatParams}
                variant="image"
                preTitle={`#${idx + 1} `}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MostPlayedCards;
