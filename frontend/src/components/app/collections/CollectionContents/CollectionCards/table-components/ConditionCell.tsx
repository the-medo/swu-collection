import React from 'react';
import { useCCDetail } from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import { conditionRenderer } from '@/lib/table/conditionRenderer.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';

interface ConditionCellProps {
  cardKey: string;
}

const ConditionCell: React.FC<ConditionCellProps> = ({ cardKey }) => {
  const collectionCard = useCCDetail(cardKey);
  return collectionCard ? (
    conditionRenderer(collectionCard.condition)
  ) : (
    <Skeleton className="w-8 h-4 rounded-md" />
  );
};

export default ConditionCell;
