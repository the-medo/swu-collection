import React from 'react';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { useCCDetail } from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import { PriceBadge } from '@/components/app/card-prices/PriceBadge.tsx';
import { cn } from '@/lib/utils.ts';
import { CardPriceSourceType } from '../../../../../../../../types/CardPrices.ts';

interface PriceSourceCellProps {
  cardKey: string;
  sourceType: CardPriceSourceType;
}

const PriceSourceCell: React.FC<PriceSourceCellProps> = ({ cardKey, sourceType }) => {
  const collectionCard = useCCDetail(cardKey);

  if (!collectionCard) return <Skeleton className="w-24 h-4 rounded-md" />;

  const cardId = collectionCard.cardId;
  const variantId = collectionCard.variantId;

  return (
    <div className={cn('flex items-center justify-end')}>
      <PriceBadge
        cardId={cardId}
        variantId={variantId}
        sourceType={sourceType}
        displayLogo={true}
        displayTooltip={true}
      />
    </div>
  );
};

export default PriceSourceCell;
