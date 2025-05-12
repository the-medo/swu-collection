import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { CardStatData } from '@/components/app/card-stats/types.ts';
import CardStatistic from '@/components/app/card-stats/CardStatistic/CardStatistic.tsx';
import { Button } from '@/components/ui/button';
import { CardType, cardTypeLabels } from '../../../../../../shared/types/cardTypes.ts';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion.tsx';

interface GroupAccordionItemProps {
  groupKey: string;
  items: CardStatData[];
  groupBy: string;
}

const GroupAccordionItem: React.FC<GroupAccordionItemProps> = ({ groupKey, items, groupBy }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [initialItemsToShow, setInitialItemsToShow] = useState(0);
  const [itemsPerLoad, setItemsPerLoad] = useState(0);

  // Calculate items per row based on container width
  useEffect(() => {
    const calculateItemsPerRow = () => {
      if (contentRef.current) {
        const containerWidth = contentRef.current.offsetWidth;

        // Only proceed if the container has a valid width
        if (containerWidth > 0) {
          const itemWidth = 220; // Width of one CardStatistic item
          const gapWidth = 8; // gap-2 is 8px

          // Calculate how many items fit in one row
          const itemsInRow = Math.floor((containerWidth + gapWidth) / (itemWidth + gapWidth));

          // Set initial items to show (one row)
          setInitialItemsToShow(Math.max(1, itemsInRow));

          // Set items per load (two rows, or three rows if only 1-2 items fit in a row)
          const rowsToLoad = itemsInRow <= 2 ? 3 : 2;
          setItemsPerLoad(Math.max(1, itemsInRow * rowsToLoad));
        }
      }
    };

    // Create a ResizeObserver to detect when the accordion content changes size
    const resizeObserver = new ResizeObserver(() => {
      calculateItemsPerRow();
    });

    // Observe the content element
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }

    // Also handle window resize events
    window.addEventListener('resize', calculateItemsPerRow);

    // Initial calculation
    calculateItemsPerRow();

    return () => {
      // Clean up
      if (contentRef.current) {
        resizeObserver.unobserve(contentRef.current);
      }
      resizeObserver.disconnect();
      window.removeEventListener('resize', calculateItemsPerRow);
    };
  }, []);

  const [itemsToShow, setItemsToShow] = useState(0);

  // Update itemsToShow when initialItemsToShow changes, but only if it's the initial render
  // or if we need to show more items due to resize
  useEffect(() => {
    if (itemsToShow === 0 || initialItemsToShow > itemsToShow) {
      setItemsToShow(initialItemsToShow);
    }
  }, [initialItemsToShow, itemsToShow]);

  const visibleItems = items.slice(0, itemsToShow);
  const hasMoreItems = itemsToShow < items.length;

  const handleLoadMore = () => {
    if (itemsPerLoad > 0) {
      setItemsToShow(prev => Math.min(prev + itemsPerLoad, items.length));
    }
  };

  return (
    <AccordionItem value={groupKey} className="border rounded-md overflow-hidden">
      <AccordionTrigger className="px-4 py-2 hover:no-underline">
        <span className="font-semibold">
          {groupBy === 'type' ? cardTypeLabels[groupKey as CardType] : groupKey}
        </span>
        <span className="text-muted-foreground ml-2">({items.length})</span>
      </AccordionTrigger>
      <AccordionContent className="px-4">
        <div className="flex flex-col gap-4" ref={contentRef}>
          <div className="flex gap-2 flex-wrap pt-2">
            {visibleItems.map(csd => (
              <CardStatistic key={csd.cardStat.cardId} card={csd.card} cardStat={csd.cardStat} />
            ))}
          </div>

          {hasMoreItems && (
            <div className="flex justify-center py-2">
              <Button variant="outline" size="sm" onClick={handleLoadMore}>
                Show more ({items.length - itemsToShow} remaining)
              </Button>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

export default GroupAccordionItem;
