import * as React from 'react';
import { cn } from '@/lib/utils.ts';
import CostIcon from '@/components/app/global/icons/CostIcon.tsx';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import DeckCardHoverImage from '@/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckCardHoverImage.tsx';

interface CardNameCellProps {
  cardId: string;
  cardData: any;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

/**
 * Component for rendering a card name with cost and aspect icons
 */
const CardNameCell: React.FC<CardNameCellProps> = ({
  cardId,
  cardData,
  isHovered,
  onMouseEnter,
  onMouseLeave,
}) => {
  if (!cardData) return <td className="p-1">{cardId}</td>;

  const cardContent = (
    <div className="flex items-center justify-between gap-2 max-w-[172px] md:max-w-[242px] overflow-hidden">
      <span className="truncate">{cardData.name}</span>
      <div className="flex gap-0 ml-1">
        {cardData.cost !== null ? <CostIcon cost={cardData.cost} size="xSmall" /> : null}
        {cardData.aspects?.map((aspect: string, i: number) => (
          <AspectIcon key={`${aspect}${i}`} aspect={aspect} size="xSmall" />
        ))}
      </div>
    </div>
  );

  return (
    <td
      className={cn('p-1 sticky left-0 z-10 bg-background', {
        'bg-accent': isHovered,
      })}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <DeckCardHoverImage card={cardData}>{cardContent}</DeckCardHoverImage>
    </td>
  );
};

export default CardNameCell;