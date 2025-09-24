import React, { useState } from 'react';
import { useUserCollectionsData } from '@/api/collection/useUserCollectionsData.ts';
import { BookOpenCheck, NotebookTabs, ScrollText } from 'lucide-react';
import { ActionSelectorRow } from '@/components/app/collections/CollectionCardActions/ActionSelectorRow.tsx';
import { CollectionType } from '../../../../../../types/enums.ts';
import CollectionCardActionStep2 from '@/components/app/collections/CollectionCardActions/CollectionCardActionStep2.tsx';
import { CollectionCardActionProps } from '@/components/app/collections/CollectionCardActions/CollectionCardAction.tsx';

interface CollectionCardActionStep1Props extends CollectionCardActionProps {}

const CollectionCardActionStep1: React.FC<CollectionCardActionStep1Props> = ({
  ...itemsAndConfiguration
}) => {
  const { data } = useUserCollectionsData();
  const [actionCollectionType, setActionCollectionType] = useState<CollectionType>();

  const collectionInfo = data?.info;

  const getIdArray = () => {
    if (!collectionInfo || actionCollectionType === undefined) return undefined;
    switch (actionCollectionType) {
      case CollectionType.COLLECTION:
        return collectionInfo.collections?.idArray;
      case CollectionType.WANTLIST:
        return collectionInfo.wantlists?.idArray;
      case CollectionType.OTHER:
        return collectionInfo.cardlists?.idArray;
      default:
        return undefined;
    }
  };

  if (actionCollectionType && collectionInfo) {
    return (
      <CollectionCardActionStep2
        collectionType={actionCollectionType}
        collectionMap={collectionInfo.map}
        collectionIdArray={getIdArray()}
        setActionCollectionType={setActionCollectionType}
        {...itemsAndConfiguration}
      />
    );
  }

  return (
    <div className="min-w-[300px] flex flex-1 flex-col rounded-md border-border p-2 bg-muted/70 gap-2">
      <h4>Action</h4>
      Do a bulk action with missing cards from this deck.
      <div className="flex flex-col gap-2">
        <ActionSelectorRow
          title="Add to collection"
          description="You have these cards and want to add them to collection."
          icon={<BookOpenCheck />}
          onClick={() => setActionCollectionType(CollectionType.COLLECTION)}
        />
        <ActionSelectorRow
          title="Add to wantlist"
          description="You want these cards."
          icon={<ScrollText />}
          onClick={() => setActionCollectionType(CollectionType.WANTLIST)}
        />
        <ActionSelectorRow
          title="Add to card list"
          description="Special-purpose lists, for example proxies"
          icon={<NotebookTabs />}
          onClick={() => setActionCollectionType(CollectionType.OTHER)}
        />
      </div>
    </div>
  );
};

export default CollectionCardActionStep1;
