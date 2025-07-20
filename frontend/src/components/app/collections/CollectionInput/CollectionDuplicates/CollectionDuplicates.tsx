import * as React from 'react';
import { useMemo } from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { CardCondition, CardLanguage } from '../../../../../../../types/enums.ts';
import { cardConditionObj } from '../../../../../../../types/iterableEnumInfo.ts';
import { useCollectionCardKeysTableColumns } from '@/components/app/collections/CollectionContents/CollectionCards/useCollectionCardKeysTableColumns.tsx';
import { DataTable } from '@/components/ui/data-table.tsx';
import { useCollectionInfo } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import {
  useCollectionCards,
  useCollectionGroupStoreLoading,
} from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';

interface CollectionDuplicatesProps {
  collectionId: string;
  selectedCardId: string | undefined;
  selectedVariantId: string | undefined;
  foil: boolean;
  language: CardLanguage;
  condition: CardCondition;
}

const CollectionDuplicates: React.FC<CollectionDuplicatesProps> = ({
  collectionId,
  selectedCardId,
  selectedVariantId,
  foil,
  language,
  condition,
}) => {
  const collectionCards = useCollectionCards();
  const { data: cardList, isFetching: isFetchingCardList } = useCardList();
  const { cardListString } = useCollectionInfo(collectionId);
  const storeLoading = useCollectionGroupStoreLoading();

  const columns = useCollectionCardKeysTableColumns({
    collectionId,
    cardList: cardList?.cards,
    layout: 'table-duplicate',
    //forceHorizontal: horizontal,
  });

  const cardsById = useMemo(() => {
    if (!selectedCardId) return [];

    // Filter card keys where the card has the selected cardId
    return Object.keys(collectionCards).filter(cardKey => {
      const detail = collectionCards[cardKey]?.collectionCard;
      return detail && detail.cardId === selectedCardId;
    });
  }, [selectedCardId, collectionCards]);

  const inCollection = useMemo(() => {
    let exactKey: string | undefined = undefined;
    let sameVariantKeys: string[] = [];
    let differentVariantKeys: string[] = [];

    cardsById.forEach(cardKey => {
      const detail = collectionCards[cardKey]?.collectionCard;
      if (!detail) return;

      if (detail.variantId !== selectedVariantId) {
        differentVariantKeys.push(cardKey);
        return;
      }

      if (
        detail.foil === foil &&
        detail.language === language &&
        detail.condition === cardConditionObj[condition].numericValue
      ) {
        exactKey = cardKey;
        return;
      }

      sameVariantKeys.push(cardKey);
    });

    return {
      exactKey,
      sameVariantKeys,
      differentVariantKeys,
      data: exactKey
        ? [exactKey, ...sameVariantKeys, ...differentVariantKeys]
        : [...sameVariantKeys, ...differentVariantKeys],
    };
  }, [cardsById, selectedVariantId, foil, language, condition, collectionCards]);

  if (!selectedCardId || !selectedVariantId) return null;

  const loading = isFetchingCardList || storeLoading;

  if (inCollection.data.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {cardListString === 'Collection' ? (
        <span className="font-bold">Already owned versions of this card:</span>
      ) : (
        <span className="font-bold">Already wanted versions of this card:</span>
      )}
      <DataTable columns={columns} data={inCollection.data} loading={loading} />
    </div>
  );
};

export default CollectionDuplicates;
