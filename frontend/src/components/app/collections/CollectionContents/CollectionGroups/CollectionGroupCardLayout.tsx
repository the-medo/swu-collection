import { CollectionLayout } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import CollectionLayoutImageBig from '@/components/app/collections/CollectionContents/CollectionCards/CollectionLayoutImageBig/CollectionLayoutImageBig.tsx';
import CollectionLayoutImageSmall from '@/components/app/collections/CollectionContents/CollectionCards/CollectionLayoutImageSmall/CollectionLayoutImageSmall.tsx';
import CollectionLayoutTableImage from '@/components/app/collections/CollectionContents/CollectionCards/CollectionLayoutTableImage/CollectionLayoutTableImage.tsx';
import CollectionLayoutTableSmall from '@/components/app/collections/CollectionContents/CollectionCards/CollectionLayoutTableSmall/CollectionLayoutTableSmall.tsx';
import {
  useCollectionGroupStore,
  useGroupCards,
} from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import * as React from 'react';
import { useMemo } from 'react';

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
  // Call hooks at the top level of this component
  const { collectionCards } = useCollectionGroupStore();
  const groupCards = groupId ? useGroupCards(groupId) : [];

  // Process cards
  const cards = useMemo(() => {
    if (!groupId) return [];
    return groupCards.map(key => collectionCards[key]?.collectionCard).filter(Boolean);
  }, [groupId, groupCards, collectionCards]);

  if (layout === CollectionLayout.IMAGE_BIG) {
    return (
      <CollectionLayoutImageBig
        key={sortBy.join('-')}
        collectionId={collectionId}
        cards={cards}
        horizontal={horizontal}
        dataTransforming={dataTransforming}
      />
    );
  } else if (layout === CollectionLayout.IMAGE_SMALL) {
    return (
      <CollectionLayoutImageSmall
        key={sortBy.join('-')}
        collectionId={collectionId}
        cards={cards}
        horizontal={horizontal}
        dataTransforming={dataTransforming}
      />
    );
  } else if (layout === CollectionLayout.TABLE_IMAGE) {
    return (
      <CollectionLayoutTableImage
        key={sortBy.join('-')}
        collectionId={collectionId}
        cards={cards}
        horizontal={horizontal}
        dataTransforming={dataTransforming}
      />
    );
  } else if (layout === CollectionLayout.TABLE_SMALL) {
    return (
      <CollectionLayoutTableSmall
        key={sortBy.join('-')}
        collectionId={collectionId}
        cards={cards}
        horizontal={horizontal}
        dataTransforming={dataTransforming}
      />
    );
  }

  return null;
};

export default CollectionGroupCardLayout;
