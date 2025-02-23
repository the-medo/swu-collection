import * as React from 'react';
import { useGetCollectionCards } from '@/api/useGetCollectionCards.ts';
import { useMemo } from 'react';
import { useCardList } from '@/api/useCardList.ts';
import { CollectionCard } from '../../../../../../../types/CollectionCard';
import { CardCondition, CardLanguage } from '../../../../../../../types/enums.ts';
import { cardConditionObj } from '../../../../../../../types/iterableEnumInfo.ts';
import { useCollectionCardTableColumns } from '@/components/app/collections/CollectionContents/CollectionCards/useCollectionCardTableColumns.tsx';
import { DataTable } from '@/components/ui/data-table.tsx';

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
  const { data: collectionCards, isFetching } = useGetCollectionCards(collectionId);
  const { data: cardList, isFetching: isFetchingCardList } = useCardList();

  const columns = useCollectionCardTableColumns({
    collectionId,
    cardList: cardList?.cards,
    layout: 'table-duplicate',
    //forceHorizontal: horizontal,
  });

  const cardsById = useMemo(() => {
    return (collectionCards?.data ?? []).filter(c => c.cardId === selectedCardId);
  }, [selectedCardId, collectionCards]);

  const inCollection = useMemo(() => {
    console.log(collectionCards?.data ?? []);

    let exact: CollectionCard | undefined = undefined;
    let sameVariant: CollectionCard[] = [];
    let differentVariant: CollectionCard[] = [];

    cardsById.filter(c => {
      if (c.variantId !== selectedVariantId) {
        differentVariant.push(c);
        return;
      }
      if (
        c.foil === foil &&
        c.language === language &&
        c.condition === cardConditionObj[condition].numericValue
      ) {
        exact = c;
        return;
      }
      sameVariant.push(c);
    });

    return {
      exact,
      sameVariant,
      differentVariant,
      data: exact
        ? [exact, ...sameVariant, ...differentVariant]
        : [...sameVariant, ...differentVariant],
    };
  }, [cardsById, selectedVariantId, foil, language, condition]);

  if (!selectedCardId || !selectedVariantId) return null;

  const loading = isFetching || isFetchingCardList;

  return <DataTable columns={columns} data={inCollection.data} loading={loading} />;
};

export default CollectionDuplicates;
