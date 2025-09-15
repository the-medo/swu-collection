import React, { useState } from 'react';
import { CollectionType } from '../../../../../../../../types/enums.ts';
import AddToExistingBox from './AddToExistingBox.tsx';
import CreateNewBox from './CreateNewBox.tsx';
import { collectionTypeTitle } from '../../../../../../../../types/iterableEnumInfo.ts';
import { Collection } from '../../../../../../../../types/Collection.ts';

interface MissingCardsActionProps {
  collectionType?: CollectionType;
  collectionMap: Record<string, Collection>;
  collectionIdArray: string[] | undefined;
}

const MissingCardsAction: React.FC<MissingCardsActionProps> = ({
  collectionType,
  collectionMap,
  collectionIdArray,
}) => {
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  if (collectionType === undefined) return null;
  const cardListString = collectionTypeTitle[collectionType];

  return (
    <div className="min-w-[300px] flex flex-col rounded-md border-border p-2 bg-muted/70 gap-2">
      <h4>Add to {cardListString}</h4>
      Choose where to put the cards missing from this deck.
      <div className="flex flex-col gap-2">
        <CreateNewBox collectionType={collectionType} />
        <AddToExistingBox
          collectionType={collectionType}
          collectionMap={collectionMap}
          collectionIdArray={collectionIdArray}
          selectedId={selectedId}
          onChange={setSelectedId}
        />
      </div>
    </div>
  );
};

export default MissingCardsAction;
