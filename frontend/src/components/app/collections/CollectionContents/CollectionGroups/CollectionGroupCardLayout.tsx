import {
  CollectionLayout,
  CollectionSortBy,
} from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import CollectionLayoutImageBig from '@/components/app/collections/CollectionContents/CollectionCards/CollectionLayoutImageBig/CollectionLayoutImageBig.tsx';
import CollectionLayoutImageSmall from '@/components/app/collections/CollectionContents/CollectionCards/CollectionLayoutImageSmall/CollectionLayoutImageSmall.tsx';
import CollectionLayoutTableImage from '@/components/app/collections/CollectionContents/CollectionCards/CollectionLayoutTableImage/CollectionLayoutTableImage.tsx';
import CollectionLayoutTableSmallKeys from '@/components/app/collections/CollectionContents/CollectionCards/CollectionLayoutTableSmall/CollectionLayoutTableSmallKeys.tsx';
import {
  useCollectionCards,
  useGroupCards,
} from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import * as React from 'react';
import { useMemo } from 'react';
import { sortCardsBy } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { getCollectionCardIdentificationKey } from '@/api/collections/usePutCollectionCard.ts';
import { useCollectionFilterStore } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionFilterStore.ts';
import { transformToId } from '../../../../../../../lib/swu-resources/lib/transformToId.ts';

// Interface for rendering cards based on layout
interface CollectionGroupCardLayoutProps {
  collectionId: string;
  groupId?: string;
  horizontal: boolean;
  dataTransforming: boolean;
  sortBy: string[];
  layout: CollectionLayout;
}

const CollectionGroupCardLayout: React.FC<CollectionGroupCardLayoutProps> = ({
  collectionId,
  groupId,
  horizontal,
  dataTransforming,
  sortBy,
  layout,
}) => {
  const { data: cardList } = useCardList();
  const collectionCards = useCollectionCards();
  const unsortedCards = useGroupCards(groupId ?? '');
  const { search } = useCollectionFilterStore();

  const groupCards = useMemo(() => {
    if (!cardList || !collectionCards || !unsortedCards) return [];
    if (sortBy.length === 0) return unsortedCards;
    const lowercaseSearch = search?.toLowerCase();
    const normalizedSearch = search ? transformToId(search) : '';
    const collectionCardArray = unsortedCards
      .map(c => collectionCards[c]?.collectionCard)
      .filter(cc => {
        if (normalizedSearch === '') return true;
        return (
          cc.cardId.includes(normalizedSearch) || cc.note.toLowerCase().includes(lowercaseSearch)
        );
      });
    return sortCardsBy(cardList?.cards, collectionCardArray, sortBy as CollectionSortBy[]).map(
      getCollectionCardIdentificationKey,
    );
  }, [unsortedCards, sortBy, search]);

  // We no longer need to map keys to CollectionCard objects
  // Just pass the keys directly to the layout components

  if (layout === CollectionLayout.IMAGE_BIG) {
    return (
      <CollectionLayoutImageBig
        key={sortBy.join('-')}
        collectionId={collectionId}
        cardKeys={groupCards}
        horizontal={horizontal}
        dataTransforming={dataTransforming}
      />
    );
  } else if (layout === CollectionLayout.IMAGE_SMALL) {
    return (
      <CollectionLayoutImageSmall
        key={sortBy.join('-')}
        collectionId={collectionId}
        cardKeys={groupCards}
        horizontal={horizontal}
        dataTransforming={dataTransforming}
      />
    );
  } else if (layout === CollectionLayout.TABLE_IMAGE) {
    return (
      <CollectionLayoutTableImage
        key={sortBy.join('-')}
        collectionId={collectionId}
        cardKeys={groupCards}
        horizontal={horizontal}
        dataTransforming={dataTransforming}
      />
    );
  } else if (layout === CollectionLayout.TABLE_SMALL) {
    return (
      <CollectionLayoutTableSmallKeys
        key={sortBy.join('-')}
        collectionId={collectionId}
        cardKeys={groupCards}
        horizontal={horizontal}
        dataTransforming={dataTransforming}
      />
    );
  }

  return null;
};

export default CollectionGroupCardLayout;
