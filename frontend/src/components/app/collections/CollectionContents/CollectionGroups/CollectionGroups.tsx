import {
  CollectionLayout,
  useCollectionLayoutStore,
} from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import CollectionLayoutImageBig from '@/components/app/collections/CollectionContents/CollectionCards/CollectionLayoutImageBig/CollectionLayoutImageBig.tsx';
import CollectionLayoutImageSmall from '@/components/app/collections/CollectionContents/CollectionCards/CollectionLayoutImageSmall/CollectionLayoutImageSmall.tsx';
import CollectionLayoutTableImage from '@/components/app/collections/CollectionContents/CollectionCards/CollectionLayoutTableImage/CollectionLayoutTableImage.tsx';
import CollectionLayoutTableSmall from '@/components/app/collections/CollectionContents/CollectionCards/CollectionLayoutTableSmall/CollectionLayoutTableSmall.tsx';
import {
  useCollectionGroupStore,
  useGroupCards,
  useCollectionGroupInfo,
  useCollectionGroupStoreLoading,
} from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion.tsx';
import * as React from 'react';
import { useMemo } from 'react';

// Separate component for rendering group items
interface GroupItemProps {
  id: string;
  parentTitle: string;
  horizontal: boolean;
  collectionId: string;
}

const GroupItem: React.FC<GroupItemProps> = ({ id, parentTitle, horizontal, collectionId }) => {
  // Call hooks at the top level of this component
  const cardKeys = useGroupCards(id);
  const groupInfo = useCollectionGroupInfo(id);

  if (!groupInfo || cardKeys.length === 0) return null;

  const label = groupInfo.label;
  const title = parentTitle !== '' ? `${parentTitle} - ${label}` : label;

  return (
    <AccordionItem key={id} value={id}>
      <AccordionTrigger>
        {title} ({cardKeys.length})
      </AccordionTrigger>
      <AccordionContent>
        <CollectionGroups
          key={id}
          horizontal={horizontal}
          parentTitle={title}
          collectionId={collectionId}
          groupId={id}
        />
      </AccordionContent>
    </AccordionItem>
  );
};

// Separate component for rendering cards based on layout
interface CardLayoutProps {
  collectionId: string;
  groupId?: string;
  horizontal: boolean;
  dataTransforming: boolean;
  sortBy: string[];
  layout: CollectionLayout;
}

const CardLayout: React.FC<CardLayoutProps> = ({
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

interface CollectionGroupsProps {
  collectionId: string;
  horizontal?: boolean;
  parentTitle?: string;
  groupId?: string;
}

const CollectionGroups: React.FC<CollectionGroupsProps> = ({
  collectionId,
  horizontal = false,
  parentTitle = '',
  groupId,
}) => {
  // Call all hooks at the top level
  const { sortBy, layout } = useCollectionLayoutStore();
  const loading = useCollectionGroupStoreLoading();
  const groupInfo = groupId ? useCollectionGroupInfo(groupId) : null;
  const dataTransforming = loading;

  // Render cards if we've reached the maximum depth or if there are no subgroups
  if (groupInfo && groupInfo.subGroupIds.length === 0) {
    return (
      <CardLayout
        collectionId={collectionId}
        groupId={groupId}
        horizontal={horizontal}
        dataTransforming={dataTransforming}
        sortBy={sortBy}
        layout={layout}
      />
    );
  }

  // If no group info, render nothing
  if (!groupInfo) {
    return null;
  }

  return (
    <>
      <Accordion type="multiple" className="pl-4 w-full" defaultValue={groupInfo.subGroupIds}>
        {groupInfo.subGroupIds.map(id => (
          <GroupItem
            key={id}
            id={id}
            parentTitle={parentTitle}
            horizontal={horizontal}
            collectionId={collectionId}
          />
        ))}
      </Accordion>
    </>
  );
};

export default CollectionGroups;
