import * as React from 'react';
import { cn } from '@/lib/utils';
import { CardStatData } from '@/components/app/card-stats/types.ts';
import { useMemo } from 'react';
import CardStatsFilters from './CardStatsFilters';
import { useSearch } from '@tanstack/react-router';
import { processCardStats } from './cardStatsUtils';
import { Accordion } from '@/components/ui/accordion.tsx';
import GroupAccordionItem from './GroupAccordionItem';
import UngroupedCardStats from './UngroupedCardStats';
import { CardStatsParams } from '@/api/card-stats';
import MobileCard from '@/components/ui/mobile-card.tsx';

interface CardStatsWithOptionsProps {
  data: CardStatData[];
  cardStatParams: CardStatsParams;
}

const CardStatsWithOptions: React.FC<CardStatsWithOptionsProps> = ({ data, cardStatParams }) => {
  // Get filter values from URL
  const search = useSearch({ strict: false });
  const sortBy = search.csSortBy || 'md';
  const groupBy = search.csGroupBy || 'none';
  const minDeckCount = search.csMinDeckCount || 0;
  const cardSearch = search.csCardSearch || '';

  // Process data: filter, sort, and group
  const { filteredAndSortedData, groupedData } = useMemo(() => {
    return processCardStats(data, {
      minDeckCount,
      cardSearch,
      sortBy,
      groupBy,
    });
  }, [data, minDeckCount, cardSearch, sortBy, groupBy]);

  return (
    <div className={cn('space-y-6')}>
      <MobileCard>
        <CardStatsFilters />
      </MobileCard>
      {filteredAndSortedData.length > 0 ? (
        <>
          {groupBy === 'none' ? (
            // Ungrouped display
            <UngroupedCardStats data={filteredAndSortedData} cardStatParams={cardStatParams} />
          ) : (
            // Grouped display with accordions and load more buttons
            <div className="space-y-4">
              <Accordion
                type="multiple"
                className="space-y-2"
                defaultValue={Object.keys(groupedData)}
                key={groupBy}
              >
                {Object.entries(groupedData).map(([groupKey, items]) => (
                  <GroupAccordionItem
                    key={`${groupBy}-${groupKey}`}
                    groupKey={groupKey}
                    items={items}
                    groupBy={groupBy}
                    cardStatParams={cardStatParams}
                  />
                ))}
              </Accordion>
            </div>
          )}
        </>
      ) : (
        <div className="h-40 flex items-center justify-center">
          <p className="text-muted-foreground">No card statistics available</p>
        </div>
      )}
    </div>
  );
};

export default CardStatsWithOptions;
