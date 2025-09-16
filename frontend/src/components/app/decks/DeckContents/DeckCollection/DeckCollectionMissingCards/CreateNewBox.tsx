import React, { useCallback, useState } from 'react';
import NewCollectionForm from '@/components/app/dialogs/NewCollectionForm.tsx';
import { CollectionType } from '../../../../../../../../types/enums.ts';
import { collectionTypeTitle } from '../../../../../../../../types/iterableEnumInfo.ts';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

interface CreateNewBoxProps {
  collectionType: CollectionType;
  onCollectionCreated: (newCollectionId: string) => void;
}

const CreateNewBox: React.FC<CreateNewBoxProps> = ({ collectionType, onCollectionCreated }) => {
  const [created, setCreated] = useState<boolean>(false);

  const collectionCreatedHandler = useCallback((newCollectionId: string) => {
    onCollectionCreated(newCollectionId);
    setCreated(true);
  }, []);

  const cardListString = collectionTypeTitle[collectionType];
  return (
    <div
      className={cn('flex flex-col gap-2 bg-background p-2 rounded-md', {
        'bg-green-100 dark:bg-green-900': created,
      })}
    >
      {created ? (
        <h5 className="mb-0 flex flex-1 flex-row gap-2 items-center justify-center text-green-600 dark:text-green-500">
          <CheckCircle2 />
          Collection created!
        </h5>
      ) : (
        <>
          <h5 className="mb-0">Create new {cardListString}</h5>
          <span className="text-xs">Create a brand new list and add missing cards there.</span>
          <NewCollectionForm
            collectionType={collectionType}
            navigateAfterCreation={false}
            onCollectionCreated={collectionCreatedHandler}
          />
        </>
      )}
    </div>
  );
};

export default CreateNewBox;
