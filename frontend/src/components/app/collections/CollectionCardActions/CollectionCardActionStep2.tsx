import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CollectionType } from '../../../../../../types/enums.ts';
import AddToExistingBox from './AddToExistingBox.tsx';
import CreateNewBox from './CreateNewBox.tsx';
import { collectionTypeTitle } from '../../../../../../types/iterableEnumInfo.ts';
import { Collection } from '../../../../../../types/Collection.ts';
import { Button } from '@/components/ui/button.tsx';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import CollectionCardActionStep3 from './CollectionCardActionStep3.tsx';
import { CollectionCardActionProps } from '@/components/app/collections/CollectionCardActions/CollectionCardAction.tsx';
import { resolveTemplatedText } from '@/components/app/collections/CollectionCardActions/collectionCardActionLib.ts';

interface CollectionCardActionStep2Props extends CollectionCardActionProps {
  collectionType?: CollectionType;
  collectionMap: Record<string, Collection>;
  collectionIdArray: string[] | undefined;
  setActionCollectionType: (collectionType: CollectionType | undefined) => void;
}

const CollectionCardActionStep2: React.FC<CollectionCardActionStep2Props> = ({
  collectionType,
  collectionMap,
  collectionIdArray,
  setActionCollectionType,
  items,
  configuration,
  templateReplacements: templateReplacementsWithoutCollectionType,
}) => {
  const { step2 } = configuration;
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [collectionCreated, setCollectionCreated] = useState(false);
  const [step, setStep] = useState<2 | 3>(2);

  const allowCreate = step2?.allowCreate !== false; // default true
  const allowExisting = step2?.allowExisting !== false; // default true

  useEffect(() => {
    if (step2?.existing?.preselectedId) {
      setSelectedId(step2.existing.preselectedId);
    }
  }, [step2?.existing?.preselectedId]);

  const onCollectionCreated = useCallback((newCollectionId: string) => {
    setSelectedId(newCollectionId);
    setCollectionCreated(true);
  }, []);

  if (collectionType === undefined) return null;

  const templateReplacements = useMemo(
    () => ({
      ...templateReplacementsWithoutCollectionType,
      collectionType: collectionTypeTitle[collectionType],
    }),
    [collectionType, templateReplacementsWithoutCollectionType],
  );

  if (step === 3 && selectedId) {
    const selected = collectionMap[selectedId];
    return (
      <CollectionCardActionStep3
        collectionId={selectedId}
        collectionTitle={selected?.title}
        collectionType={collectionType}
        onBack={() => setStep(2)}
        items={items}
        configuration={configuration}
        templateReplacements={templateReplacements}
      />
    );
  }

  const showOr = allowCreate && allowExisting && !collectionCreated;

  return (
    <>
      <h4>{resolveTemplatedText(step2?.title, templateReplacements)}</h4>
      {resolveTemplatedText(step2?.description, templateReplacements)}
      <div className="flex flex-col gap-2">
        {allowCreate && (
          <CreateNewBox
            collectionType={collectionType}
            onCollectionCreated={onCollectionCreated}
            predefinedTitle={resolveTemplatedText(
              step2?.create?.predefinedTitle,
              templateReplacements,
            )}
            predefinedDescription={resolveTemplatedText(
              step2?.create?.predefinedDescription,
              templateReplacements,
            )}
            disable={step2?.create?.disable}
          />
        )}
        {showOr && (
          <div className="flex flex-1 justify-center">
            <h5 className="mb-0">OR</h5>
          </div>
        )}
        {allowExisting && (
          <AddToExistingBox
            collectionType={collectionType}
            collectionMap={collectionMap}
            collectionIdArray={collectionIdArray}
            selectedId={selectedId}
            onChange={val => {
              if (step2?.existing?.disable) return; // locked selection
              setSelectedId(val);
            }}
            disabled={step2?.existing?.disable}
          />
        )}
      </div>
      <div className="flex justify-between items-center">
        <Button
          size="icon"
          aria-label={`Go to back`}
          onClick={() => setActionCollectionType(undefined)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          disabled={(!selectedId && !collectionCreated) || (!allowExisting && !collectionCreated)}
          onClick={() => (selectedId || collectionCreated) && setStep(3)}
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
};

export default CollectionCardActionStep2;
