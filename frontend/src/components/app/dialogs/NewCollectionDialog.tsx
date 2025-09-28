import Dialog, { DialogProps } from '@/components/app/global/Dialog.tsx';
import * as React from 'react';
import { useUser } from '@/hooks/useUser.ts';
import { useCallback, useState } from 'react';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { useNavigate } from '@tanstack/react-router';
import { CollectionType } from '../../../../../types/enums.ts';
import { collectionTypeTitle } from '../../../../../types/iterableEnumInfo.ts';
import NewCollectionForm from '@/components/app/dialogs/NewCollectionForm.tsx';

type NewCollectionDialogProps = Pick<DialogProps, 'trigger' | 'triggerDisabled'> & {
  collectionType: CollectionType;
};

const NewCollectionDialog: React.FC<NewCollectionDialogProps> = ({
  trigger,
  triggerDisabled,
  collectionType,
}) => {
  const navigate = useNavigate();
  const user = useUser();
  const [open, setOpen] = useState(false);
  const cardListString = collectionTypeTitle[collectionType];

  const onCollectionCreated = useCallback((newCollectionId: string) => {
    navigate({ to: `/collections/${newCollectionId}` });
    setOpen(false);
  }, []);

  return (
    <Dialog
      trigger={trigger}
      triggerDisabled={triggerDisabled}
      header={`New ${cardListString}`}
      open={open}
      onOpenChange={setOpen}
    >
      {user ? (
        <NewCollectionForm
          collectionType={collectionType}
          onCollectionCreated={onCollectionCreated}
        />
      ) : (
        <div className="flex flex-col gap-4">
          Please sign in to create new {cardListString.toLowerCase()}.
          <SignIn />
        </div>
      )}
    </Dialog>
  );
};

export default NewCollectionDialog;
