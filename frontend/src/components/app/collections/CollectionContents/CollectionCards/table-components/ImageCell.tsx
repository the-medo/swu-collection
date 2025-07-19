import React from 'react';
import {
  useCCDetail,
  useCCCard,
} from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import CardImage from '@/components/app/global/CardImage.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';

interface ImageCellProps {
  cardKey: string;
  forceHorizontal?: boolean;
}

const ImageCell: React.FC<ImageCellProps> = ({ cardKey, forceHorizontal = false }) => {
  const collectionCard = useCCDetail(cardKey);
  const card = useCCCard(cardKey);

  if (!card || !collectionCard) return <Skeleton className="w-8 h-4 rounded-md" />;

  return (
    <CardImage
      card={card}
      cardVariantId={collectionCard.variantId}
      size="w50"
      foil={collectionCard.foil}
      forceHorizontal={forceHorizontal}
    />
  );
};

export default ImageCell;
