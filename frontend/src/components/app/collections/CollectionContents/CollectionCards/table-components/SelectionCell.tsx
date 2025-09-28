import React from 'react';
import { useCCDetail } from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import CollectionCardSelectionInput from '@/components/app/collections/CollectionCardSelection/CollectionCardSelectionInput.tsx';

interface SelectionCellProps {
  cardKey: string;
  collectionId: string;
}

const SelectionCell: React.FC<SelectionCellProps> = ({ cardKey, collectionId }) => {
  const collectionCard = useCCDetail(cardKey);
  if (!collectionCard) return null;
  return <CollectionCardSelectionInput collectionId={collectionId} card={collectionCard} />;
};

export default SelectionCell;
