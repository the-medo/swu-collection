import * as React from 'react';
import { PropsWithChildren } from 'react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardPortal,
  HoverCardTrigger,
} from '@/components/ui/hover-card.tsx';
import { cn } from '@/lib/utils.ts';
import CardImage, { cardImageVariants } from '@/components/app/global/CardImage.tsx';
import { selectDefaultVariant } from '../../../../../../../../server/lib/cards/selectDefaultVariant.ts';
import type {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../../../lib/swu-resources/types.ts';
import { useSidebar } from '@/components/ui/sidebar.tsx';

import type { CardImageVariantProps } from '@/components/app/global/CardImage.tsx';

interface DeckCardHoverImageProps extends PropsWithChildren {
  card: CardDataWithVariants<CardListVariants> | undefined;
  size?: CardImageVariantProps['size'];
}

const DeckCardHoverImage: React.FC<DeckCardHoverImageProps> = ({ card, size = 'original', children }) => {
  const { isMobile } = useSidebar();
  const defaultVariant = card ? selectDefaultVariant(card) : '';

  if (isMobile) return children;

  return (
    <HoverCard openDelay={0} closeDelay={0}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>

      {isMobile ? null : (
        <HoverCardPortal>
          <HoverCardContent
            className={cn(
              cardImageVariants({
                size,
                horizontal: card?.front.horizontal ?? false,
              }),
              'm-0 p-0 w-fit',
            )}
            side="left"
            sideOffset={10}
            align="start"
            avoidCollisions={true}
          >
            <CardImage card={card} cardVariantId={defaultVariant} size={size} />
          </HoverCardContent>
        </HoverCardPortal>
      )}
    </HoverCard>
  );
};

export default DeckCardHoverImage;
