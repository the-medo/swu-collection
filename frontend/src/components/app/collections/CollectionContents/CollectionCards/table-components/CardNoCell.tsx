import React from 'react';
import { useCCVariant } from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import { Skeleton } from '@/components/ui/skeleton.tsx';

interface CardNoCellProps {
  cardKey: string;
}

const CardNoCell: React.FC<CardNoCellProps> = ({ cardKey }) => {
  const variant = useCCVariant(cardKey);

  if (!variant) return <Skeleton className="w-8 h-4 rounded-md" />;

  return <span className="text-xs text-gray-500 w-8">{variant?.cardNo}</span>;
};

export default CardNoCell;