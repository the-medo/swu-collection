import React from 'react';
import { useCCVariant } from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import { Skeleton } from '@/components/ui/skeleton.tsx';

interface SetCellProps {
  cardKey: string;
}

const SetCell: React.FC<SetCellProps> = ({ cardKey }) => {
  const variant = useCCVariant(cardKey);

  if (!variant) return <Skeleton className="w-8 h-4 rounded-md" />;

  return (
    <span className="text-xs font-medium text-gray-500 w-8">
      {variant?.set.toUpperCase()}
    </span>
  );
};

export default SetCell;