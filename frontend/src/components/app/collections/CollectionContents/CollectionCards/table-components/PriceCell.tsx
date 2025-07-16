import React from 'react';
import { useCCDetail } from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import { getIdentificationFromCollectionCard } from '@/components/app/collections/CollectionCardTable/collectionTableLib.tsx';
import { getCollectionCardIdentificationKey } from '@/api/collections/usePutCollectionCard.ts';
import CollectionCardInput, { CollectionCardInputProps } from '@/components/app/collections/CollectionContents/components/CollectionCardInput.tsx';
import { cn } from '@/lib/utils.ts';

interface PriceCellProps {
  cardKey: string;
  collectionId: string;
  owned: boolean;
  currency: string;
  onChange: CollectionCardInputProps['onChange'];
}

const PriceCell: React.FC<PriceCellProps> = ({ cardKey, collectionId, owned, currency, onChange }) => {
  const collectionCard = useCCDetail(cardKey);
  const price = collectionCard.price;
  const id = getIdentificationFromCollectionCard(collectionCard);

  return (
    <div
      className={cn('flex gap-2 items-center justify-end', {
        'w-32': owned,
        'w-20': !owned,
      })}
    >
      {owned ? (
        <CollectionCardInput
          inputId={getCollectionCardIdentificationKey(id)}
          id={id}
          field="price"
          value={price}
          onChange={onChange}
        />
      ) : (
        <span>{price}</span>
      )}
      <span>{price ? currency : '-'}</span>
    </div>
  );
};

export default PriceCell;
