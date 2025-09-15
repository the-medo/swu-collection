import Dialog, { DialogProps } from '@/components/app/global/Dialog.tsx';
import * as React from 'react';
import { useUser } from '@/hooks/useUser.ts';
import { useToast } from '@/hooks/use-toast.ts';
import { useForm } from '@tanstack/react-form';
import { Label } from '@/components/ui/label.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { useState } from 'react';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { useNavigate } from '@tanstack/react-router';
import { Textarea } from '@/components/ui/textarea.tsx';
import { usePostCollection } from '@/api/collections/usePostCollection.ts';
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
  const { toast } = useToast();
  const cardListString = collectionTypeTitle[collectionType];

  return (
    <Dialog
      trigger={trigger}
      triggerDisabled={triggerDisabled}
      header={`New ${cardListString}`}
      open={open}
      onOpenChange={setOpen}
    >
      {user ? (
        <NewCollectionForm collectionType={collectionType} />
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
