import React from 'react';
import { useCCCard } from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import RarityIcon from '@/components/app/global/icons/RarityIcon.tsx';

interface RarityCellProps {
  cardKey: string;
}

const RarityCell: React.FC<RarityCellProps> = ({ cardKey }) => {
  const card = useCCCard(cardKey);

  if (!card) return <Skeleton className="w-4 h-4 rounded-md" />;

  return <RarityIcon rarity={card.rarity} size="small" />;
};

export default RarityCell;