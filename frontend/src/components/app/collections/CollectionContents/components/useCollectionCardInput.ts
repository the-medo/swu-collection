import { usePutCollectionCard } from '@/api/collections/usePutCollectionCard.ts';
import { useCallback } from 'react';
import { CollectionCardInputProps } from '@/components/app/collections/CollectionContents/components/CollectionCardInput.tsx';

export const useCollectionCardInput = (
  collectionId: string,
): CollectionCardInputProps['onChange'] => {
  const mutation = usePutCollectionCard(collectionId);

  return useCallback(
    // @ts-ignore
    async (id, field, value) => {
      if (!id) return;
      await mutation.mutateAsync({
        id: id,
        data: {
          [field]: value,
        },
      });
    },
    [],
  );
};
