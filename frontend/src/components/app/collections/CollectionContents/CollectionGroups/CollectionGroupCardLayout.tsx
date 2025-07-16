import { CollectionLayout } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import CollectionLayoutImageBig from '@/components/app/collections/CollectionContents/CollectionCards/CollectionLayoutImageBig/CollectionLayoutImageBig.tsx';
import CollectionLayoutImageSmall from '@/components/app/collections/CollectionContents/CollectionCards/CollectionLayoutImageSmall/CollectionLayoutImageSmall.tsx';
import CollectionLayoutTableImage from '@/components/app/collections/CollectionContents/CollectionCards/CollectionLayoutTableImage/CollectionLayoutTableImage.tsx';
import CollectionLayoutTableSmall from '@/components/app/collections/CollectionContents/CollectionCards/CollectionLayoutTableSmall/CollectionLayoutTableSmall.tsx';
import { useGroupCards } from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import * as React from 'react';

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
  const groupCards = useGroupCards(groupId ?? '');

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
      <CollectionLayoutTableSmall
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
