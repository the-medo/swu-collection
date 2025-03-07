import { DeckCard } from '../../../../../../../types/ZDeckCard.ts';
import type {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../../../lib/swu-resources/types.ts';
import { selectDefaultVariant } from '@/lib/cards/selectDefaultVariant.ts';
import { cn } from '@/lib/utils.ts';
import * as React from 'react';
import CardImage, { cardImageVariants } from '@/components/app/global/CardImage.tsx';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card.tsx';
import CostIcon from '@/components/app/global/icons/CostIcon.tsx';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';

interface DeckCardRowProps {
  deckId: string;
  deckCard: DeckCard;
  card: CardDataWithVariants<CardListVariants> | undefined;
}

const DeckCardRow: React.FC<DeckCardRowProps> = ({ /*deckId,*/ deckCard, card }) => {
  const defaultVariant = card ? selectDefaultVariant(card) : '';

  return (
    <div className="flex gap-2 border-t-[1px] py-1 w-[350px] items-center">
      <span className="font-medium text-sm">{deckCard.quantity}</span>
      <HoverCard openDelay={0} closeDelay={0}>
        <HoverCardTrigger asChild>
          <div className="flex gap-1 font text-sm w-full items-center justify-between">
            <span>{card?.name}</span>
            <div className="flex gap-0 w-[50px]">
              {card?.cost !== null ? <CostIcon cost={card?.cost ?? 0} size="xSmall" /> : null}
              {card?.aspects.map((a, i) => (
                <AspectIcon key={`${a}${i}`} aspect={a} size="xSmall" />
              ))}
            </div>
          </div>
        </HoverCardTrigger>

        <HoverCardContent
          className={cn(
            cardImageVariants({
              size: 'original',
              horizontal: card?.front.horizontal ?? false,
            }),
            'm-0 p-0',
          )}
        >
          <CardImage card={card} cardVariantId={defaultVariant} size="original" />
        </HoverCardContent>
      </HoverCard>
    </div>
  );
};

export default DeckCardRow;
