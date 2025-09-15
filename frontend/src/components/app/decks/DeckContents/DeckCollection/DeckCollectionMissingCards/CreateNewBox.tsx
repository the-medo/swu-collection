import React from 'react';
import NewCollectionForm from '@/components/app/dialogs/NewCollectionForm.tsx';
import { CollectionType } from '../../../../../../../../types/enums.ts';
import { collectionTypeTitle } from '../../../../../../../../types/iterableEnumInfo.ts';

interface CreateNewBoxProps {
  collectionType: CollectionType;
}

const CreateNewBox: React.FC<CreateNewBoxProps> = ({ collectionType }) => {
  const cardListString = collectionTypeTitle[collectionType];
  return (
    <div className="flex flex-col gap-2 bg-background p-2 rounded-md">
      <h5 className="mb-0">Create new {cardListString}</h5>
      <span className="text-xs">Create a brand new list and add missing cards there.</span>
      <NewCollectionForm collectionType={collectionType} navigateAfterCreation={false} />
    </div>
  );
};

export default CreateNewBox;
