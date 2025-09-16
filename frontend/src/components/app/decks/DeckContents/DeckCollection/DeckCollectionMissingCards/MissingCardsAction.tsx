import React, { useCallback, useState } from 'react';
import { CollectionType } from '../../../../../../../../types/enums.ts';
import AddToExistingBox from './AddToExistingBox.tsx';
import CreateNewBox from './CreateNewBox.tsx';
import { collectionTypeTitle } from '../../../../../../../../types/iterableEnumInfo.ts';
import { Collection } from '../../../../../../../../types/Collection.ts';
import { Button } from '@/components/ui/button.tsx';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface MissingCardsActionProps {
  collectionType?: CollectionType;
  collectionMap: Record<string, Collection>;
  collectionIdArray: string[] | undefined;
  setActionCollectionType: (collectionType: CollectionType | undefined) => void;
}

const MissingCardsAction: React.FC<MissingCardsActionProps> = ({
  collectionType,
  collectionMap,
  collectionIdArray,
  setActionCollectionType,
}) => {
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [collectionCreated, setCollectionCreated] = useState(false);

  const onCollectionCreated = useCallback((newCollectionId: string) => {
    setSelectedId(newCollectionId);
    setCollectionCreated(true);
  }, []);

  if (collectionType === undefined) return null;
  const cardListString = collectionTypeTitle[collectionType];

  return (
    <div className="min-w-[300px] flex flex-col rounded-md border-border p-2 bg-muted/70 gap-2">
      <h4>Add to {cardListString}</h4>
      Choose where to put the cards missing from this deck.
      <div className="flex flex-col gap-2">
        <CreateNewBox collectionType={collectionType} onCollectionCreated={onCollectionCreated} />
        {!collectionCreated && (
          <div className="flex flex-1 justify-center">
            <h5 className="mb-0">OR</h5>
          </div>
        )}
        <AddToExistingBox
          collectionType={collectionType}
          collectionMap={collectionMap}
          collectionIdArray={collectionIdArray}
          selectedId={selectedId}
          onChange={setSelectedId}
        />
      </div>
      <div className="flex justify-between items-center">
        <Button
          size="icon"
          aria-label={`Go to back`}
          onClick={() => setActionCollectionType(undefined)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button>
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default MissingCardsAction;
