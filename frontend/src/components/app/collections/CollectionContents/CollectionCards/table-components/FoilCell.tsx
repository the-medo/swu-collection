import React from 'react';
import { useCCDetail } from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import { foilRenderer } from '@/lib/table/foilRenderer.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';

interface FoilCellProps {
  cardKey: string;
}

const FoilCell: React.FC<FoilCellProps> = ({ cardKey }) => {
  const collectionCard = useCCDetail(cardKey);
  return collectionCard ? (
    foilRenderer(collectionCard.foil)
  ) : (
    <Skeleton className="w-8 h-4 rounded-md" />
  );
};

export default FoilCell;
