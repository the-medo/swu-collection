import React from 'react';
import { useCCDetail } from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import { conditionRenderer } from '@/lib/table/conditionRenderer.tsx';

interface ConditionCellProps {
  cardKey: string;
}

const ConditionCell: React.FC<ConditionCellProps> = ({ cardKey }) => {
  const collectionCard = useCCDetail(cardKey);
  return conditionRenderer(collectionCard.condition);
};

export default ConditionCell;