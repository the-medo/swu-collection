import * as React from 'react';
import { cn } from '@/lib/utils.ts';

interface SectionTitleRowProps {
  title: string;
  cardIds: string[];
  cardListData: any;
  hoveredColumn: number | null;
  setHoveredColumn: (column: number | null) => void;
}

/**
 * Component for rendering section title rows (Main Deck, Sideboard)
 */
const SectionTitleRow: React.FC<SectionTitleRowProps> = ({
  title,
  cardIds,
  cardListData,
  hoveredColumn,
  setHoveredColumn,
}) => {
  return (
    <tr className="sticky top-[140px] z-50 bg-background">
      <td
        className="font-semibold text-lg sticky left-0 top-[140px] z-50 p-0 bg-background"
        onMouseEnter={() => setHoveredColumn(-1)}
        onMouseLeave={() => setHoveredColumn(null)}
      >
        <div className={cn('h-full w-full flex items-center justify-center bg-primary/20 p-2')}>
          {title}
        </div>
        <div className="absolute right-0 left-0 bottom-0 h-[2px] bg-border"></div>
      </td>

      {cardIds.map((cardId, index) => {
        const cardData = cardListData?.cards[cardId];
        return (
          <td
            key={cardId}
            className={cn('text-center bg-primary/20 relative', {
              'bg-accent': hoveredColumn === index + 1,
            })}
            onMouseEnter={() => setHoveredColumn(index + 1)}
            onMouseLeave={() => setHoveredColumn(null)}
          >
            <div className="absolute right-0 left-0 bottom-0 h-[2px] bg-border"></div>
            <div className="h-full w-full flex items-center justify-center p-2">
              <span className="text-xs truncate max-w-[75px]">{cardData?.name || cardId}</span>
            </div>
          </td>
        );
      })}

      <td
        className="text-center bg-accent min-w-[100px] relative"
        onMouseEnter={() => setHoveredColumn(cardIds.length + 1)}
        onMouseLeave={() => setHoveredColumn(null)}
      >
        <div className="absolute top-0 left-0 bottom-0 w-[2px] bg-border"> </div>
        <div className="absolute right-0 left-0 bottom-0 h-[2px] bg-border"></div>
        <div className="h-full w-full flex items-center justify-center p-2">Avg.</div>
      </td>
    </tr>
  );
};

export default SectionTitleRow;