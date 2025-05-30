import * as React from 'react';
import { useMemo } from 'react';
import { CardStatData } from '@/components/app/card-stats/types.ts';
import CardStatistic from '@/components/app/card-stats/CardStatistic/CardStatistic.tsx';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll.ts';
import { getVisibleUngroupedData } from './cardStatsUtils';
import { CardStatsParams } from '@/api/card-stats';

interface UngroupedCardStatsProps {
  data: CardStatData[];
  cardStatParams: CardStatsParams;
}

const UngroupedCardStats: React.FC<UngroupedCardStatsProps> = ({ data, cardStatParams }) => {
  // Setup infinite scroll
  const { itemsToShow, observerTarget } = useInfiniteScroll({
    totalItems: data.length,
    initialItemsToLoad: 30,
    itemsPerBatch: 21,
    threshold: 300,
  });

  // Get visible data for ungrouped display
  const visibleData = useMemo(() => {
    return getVisibleUngroupedData(data, itemsToShow);
  }, [data, itemsToShow]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {visibleData.map(csd => (
          <CardStatistic
            key={csd.cardStat.cardId}
            card={csd.card}
            cardStat={csd.cardStat}
            cardStatParams={cardStatParams}
          />
        ))}
      </div>
      <div ref={observerTarget} id="OBSERVER">
        {' '}
      </div>
    </div>
  );
};

export default UngroupedCardStats;
