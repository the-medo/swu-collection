import * as React from 'react';
import { cn } from '@/lib/utils.ts';

interface DeckNameCellProps {
  deckId: string;
  deckName: string;
  isMainDeck: boolean;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

/**
 * Component for rendering a deck name cell
 */
const DeckNameCell: React.FC<DeckNameCellProps> = ({
  deckId,
  deckName,
  isMainDeck,
  isHovered,
  onMouseEnter,
  onMouseLeave,
}) => {
  return (
    <td
      className={cn('p-1 sticky left-0 z-10 bg-background', {
        'bg-accent': isHovered,
        'font-semibold': isMainDeck,
      })}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-center justify-between gap-2 max-w-[172px] md:max-w-[242px] overflow-hidden">
        <span className="truncate">{deckName}</span>
        {isMainDeck && <span className="text-xs text-muted-foreground">(Main)</span>}
      </div>
    </td>
  );
};

export default DeckNameCell;