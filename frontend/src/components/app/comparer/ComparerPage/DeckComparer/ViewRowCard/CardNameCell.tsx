import * as React from 'react';
import type { CardListResponse } from '@/api/lists/useCardList.ts';
import { comparerTableStyles as styles } from '../comparerTableStyles.ts';
import { cn } from '@/lib/utils.ts';
import CostIcon from '@/components/app/global/icons/CostIcon.tsx';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import DeckCardHoverImage from '@/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckCardHoverImage.tsx';

interface CardNameCellProps {
  cardId: string;
  cardData: CardListResponse['cards'][string] | undefined;
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
  if (!cardData)
    return (
      <th scope="row" className={cn(styles.name, 'border-b border-border/40 font-normal')}>
        {cardId}
      </th>
    );

  const cardContent = (
    <div className="flex items-center justify-between gap-1 overflow-hidden">
      <span
        className="truncate"
        title={[cardData.name, cardData.subtitle].filter(Boolean).join(' — ')}
      >
        {cardData.name}
      </span>
      <div className="flex shrink-0 gap-0">
        {cardData.cost !== null ? <CostIcon cost={cardData.cost} size="xSmall" /> : null}
        {cardData.aspects?.map((aspect: string, i: number) => (
          <AspectIcon key={`${aspect}${i}`} aspect={aspect} size="xSmall" />
        ))}
      </div>
    </div>
  );

  return (
    <th
      scope="row"
      className={cn(
        styles.name,
        'border-b border-border/40 font-normal',
        isHovered && styles.hover,
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <DeckCardHoverImage card={cardData}>{cardContent}</DeckCardHoverImage>
    </th>
  );
};

export default CardNameCell;
