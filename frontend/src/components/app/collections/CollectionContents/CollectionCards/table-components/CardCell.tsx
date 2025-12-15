import React from 'react';
import {
  useCCDetail,
  useCCCard,
} from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import { HoverCard, HoverCardContent, HoverCardPortal, HoverCardTrigger } from '@/components/ui/hover-card.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import CardImage from '@/components/app/global/CardImage.tsx';
import CostIcon from '@/components/app/global/icons/CostIcon.tsx';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import { CollectionLayout } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';

interface CardCellProps {
  cardKey: string;
  layout: CollectionLayout | 'table-duplicate' | 'table-list';
}

const CardCell: React.FC<CardCellProps> = ({ cardKey, layout }) => {
  const collectionCard = useCCDetail(cardKey);
  const card = useCCCard(cardKey);

  if (!card || !collectionCard) return <Skeleton className="w-full h-4 rounded-md" />;

  return (
    <HoverCard openDelay={0} closeDelay={0}>
      <HoverCardTrigger>
        <div className="flex py-1 gap-1 flex-col">
          <span className="min-w-[250px]">{card.name}</span>
          {layout === CollectionLayout.TABLE_IMAGE && (
            <div className="flex gap-1">
              {card?.cost !== null ? <CostIcon cost={card?.cost ?? 0} size="small" /> : null}
              {card?.aspects.map((a, i) => (
                <AspectIcon key={`${a}${i}`} aspect={a} size="small" />
              ))}
            </div>
          )}
        </div>
      </HoverCardTrigger>
      <HoverCardPortal>
        <HoverCardContent side="right" className=" w-fit">
          <CardImage
            card={card}
            cardVariantId={collectionCard.variantId}
            size={card?.front?.horizontal ? 'h350' : 'w200'}
            foil={collectionCard.foil}
            forceHorizontal={card?.front?.horizontal}
          />
        </HoverCardContent>
      </HoverCardPortal>
    </HoverCard>
  );
};

export default CardCell;
