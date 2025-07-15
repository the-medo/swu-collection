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
  useCollectionGroup,
  useGroupCards,
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
  group: any;
  parentTitle: string;
  horizontal: boolean;
  collectionId: string;
  depth: number;
}

const GroupItem: React.FC<GroupItemProps> = ({
  id,
  group,
  parentTitle,
  horizontal,
  collectionId,
  depth,
}) => {
  // Call hooks at the top level of this component
  const cardKeys = useGroupCards(id);

  if (!group || cardKeys.length === 0) return null;

  const label = group.label;
  const title = parentTitle !== '' ? `${parentTitle} - ${label}` : label;

  return (
    <AccordionItem key={id} value={id}>
      <AccordionTrigger>
        {title} ({cardKeys.length})
      </AccordionTrigger>
      <AccordionContent>
        <CollectionGroups
          key={id}
          depth={depth + 1}
          horizontal={horizontal || group.horizontal}
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
    return groupCards.map(key => collectionCards[key]).filter(Boolean);
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
  depth: number;
  horizontal?: boolean;
  parentTitle?: string;
  groupId?: string;
}

const CollectionGroups: React.FC<CollectionGroupsProps> = ({
  collectionId,
  depth,
  horizontal = false,
  parentTitle = '',
  groupId,
}) => {
  // Call all hooks at the top level
  const { groupBy, sortBy, layout } = useCollectionLayoutStore();
  const { loading } = useCollectionGroupStore();
  const groupData = useCollectionGroup(collectionId);
  const dataTransforming = loading;

  // Render cards if we've reached the maximum depth
  if (depth === groupBy.length) {
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

  // If no group data, render nothing
  if (!groupData || !groupData.sortedIds) {
    return null;
  }

  return (
    <>
      <Accordion type="multiple" className="pl-4 w-full" defaultValue={groupData.sortedIds}>
        {groupData.sortedIds.map(id => (
          <GroupItem
            key={id}
            id={id}
            group={groupData.groups[id]}
            parentTitle={parentTitle}
            horizontal={horizontal}
            collectionId={collectionId}
            depth={depth}
          />
        ))}
      </Accordion>
    </>
  );
};

export default CollectionGroups;
