import React from 'react';
import { useCCDetail } from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import { getIdentificationFromCollectionCard } from '@/components/app/collections/CollectionCardTable/collectionTableLib.tsx';
import { getCollectionCardIdentificationKey } from '@/api/collections/usePutCollectionCard.ts';
import CollectionCardInput, { CollectionCardInputProps } from '@/components/app/collections/CollectionContents/components/CollectionCardInput.tsx';

interface AmountCellProps {
  cardKey: string;
  collectionId: string;
  owned: boolean;
  onChange: CollectionCardInputProps['onChange'];
}

const AmountCell: React.FC<AmountCellProps> = ({ cardKey, collectionId, owned, onChange }) => {
  const collectionCard = useCCDetail(cardKey);
  const amount = collectionCard.amount;

  if (owned) {
    const id = getIdentificationFromCollectionCard(collectionCard);
    return (
      <CollectionCardInput
        inputId={getCollectionCardIdentificationKey(id)}
        id={id}
        field="amount"
        value={amount}
        onChange={onChange}
      />
    );
  }

  return <div className="font-medium text-right w-8">{amount}</div>;
};

export default AmountCell;
