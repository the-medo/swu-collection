import React from 'react';
import { useCCDetail, useCCCard } from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import CardImage from '@/components/app/global/CardImage.tsx';

interface ImageCellProps {
  cardKey: string;
  forceHorizontal?: boolean;
}

const ImageCell: React.FC<ImageCellProps> = ({ cardKey, forceHorizontal = false }) => {
  const collectionCard = useCCDetail(cardKey);
  const card = useCCCard(cardKey);

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