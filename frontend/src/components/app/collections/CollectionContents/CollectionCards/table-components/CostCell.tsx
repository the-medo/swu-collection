import React from 'react';
import { useCCCard } from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import CostIcon from '@/components/app/global/icons/CostIcon.tsx';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';

interface CostCellProps {
  cardKey: string;
}

const CostCell: React.FC<CostCellProps> = ({ cardKey }) => {
  const card = useCCCard(cardKey);

  if (!card) return <Skeleton className="w-16 h-4 rounded-md" />;

  return (
    <div className="flex gap-1 w-16">
      {card?.cost !== null ? <CostIcon cost={card?.cost ?? 0} size="small" /> : null}
      {card?.aspects.map((a, i) => <AspectIcon key={`${a}${i}`} aspect={a} size="small" />)}
    </div>
  );
};

export default CostCell;