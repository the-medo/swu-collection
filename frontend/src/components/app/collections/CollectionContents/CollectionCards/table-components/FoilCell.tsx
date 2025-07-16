import React from 'react';
import { useCCDetail } from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import { foilRenderer } from '@/lib/table/foilRenderer.tsx';

interface FoilCellProps {
  cardKey: string;
}

const FoilCell: React.FC<FoilCellProps> = ({ cardKey }) => {
  const collectionCard = useCCDetail(cardKey);
  return foilRenderer(collectionCard.foil);
};

export default FoilCell;