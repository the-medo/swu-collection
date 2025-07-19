import { useCollectionLayoutStore } from '@/components/app/collections/CollectionContents/CollectionSettings/useCollectionLayoutStore.ts';
import {
  useCollectionGroupInfoSubgroups,
  useCollectionGroupStoreLoading,
} from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import { Accordion } from '@/components/ui/accordion.tsx';
import * as React from 'react';
import CollectionGroupCardLayout from './CollectionGroupCardLayout.tsx';
import CollectionGroupItem from './CollectionGroupItem.tsx';

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
  const groupSubgroupIds = useCollectionGroupInfoSubgroups(groupId ?? '');
  const dataTransforming = loading;

  // If no group info, render nothing
  if (!groupSubgroupIds) {
    return null;
  }

  // Render cards if we've reached the maximum depth or if there are no subgroups
  if (groupSubgroupIds.length === 0) {
    return (
      <CollectionGroupCardLayout
        collectionId={collectionId}
        groupId={groupId}
        horizontal={horizontal}
        dataTransforming={dataTransforming}
        sortBy={sortBy}
        layout={layout}
      />
    );
  }

  return (
    <>
      <Accordion type="multiple" className="pl-4 w-full" defaultValue={groupSubgroupIds}>
        {groupSubgroupIds.map(id => (
          <CollectionGroupItem
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
