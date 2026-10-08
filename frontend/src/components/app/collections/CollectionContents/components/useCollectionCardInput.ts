import { usePutCollectionCard } from '@/api/collections/usePutCollectionCard.ts';
import { useCallback } from 'react';
import { CollectionCardInputProps } from '@/components/app/collections/CollectionContents/components/CollectionCardInput.tsx';

export const useCollectionCardInput = (
  collectionId: string,
): CollectionCardInputProps['onChange'] => {
  const { mutateAsync } = usePutCollectionCard(collectionId);

  return useCallback(
    async (id, field, value) => {
      if (!id) return;
      await mutateAsync({
        id,
        data: {
          [field]: value,
        },
      });
    },
    [mutateAsync],
  );
};
