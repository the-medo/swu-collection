import { dialogStyles } from '@/components/ui/dialogStyles';
import Dialog, { DialogProps } from '@/components/app/global/Dialog.tsx';
import * as React from 'react';
import { useUser } from '@/hooks/useUser.ts';
import { useToast } from '@/hooks/use-toast.ts';
import { useForm } from '@tanstack/react-form';
import { Label } from '@/components/ui/label.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { useCallback, useId, useState } from 'react';
import DialogOption from '@/components/app/global/DialogOption.tsx';
import { collectionTypeTitle } from '../../../../../types/iterableEnumInfo.ts';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { Collection } from '../../../../../types/Collection.ts';
import { usePutCollection } from '@/api/collections/usePutCollection.ts';
import { CollectionType } from '../../../../../types/enums.ts';

type EditCollectionDialogProps = Pick<DialogProps, 'trigger'> & {
  collection: Collection;
};

const EditCollectionDialog: React.FC<EditCollectionDialogProps> = ({ trigger, collection }) => {
  const isCollection = collection.collectionType === CollectionType.COLLECTION;
  const user = useUser();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const cardListString = collectionTypeTitle[collection.collectionType];
  const inputId = useId();
  const putCollectionMutation = usePutCollection();

  const form = useForm({
    defaultValues: {
      title: collection.title ?? '',
      description: collection.description ?? '',
      public: collection.public ?? false,
      forSale: collection.forSale ?? false,
      forDecks: collection.forDecks ?? false,
    },
    onSubmit: async ({ value }) => {
      // Call our hook's mutation function.
      putCollectionMutation.mutate(
        {
          collectionId: collection.id,
          title: value.title,
          description: value.description,
          public: value.public,
          ...(isCollection ? { forSale: value.forSale, forDecks: value.forDecks } : {}),
        },
        {
          onSuccess: () => {
            toast({
              title: `${cardListString} updated!`,
            });
            setOpen(false);
          },
        },
      );
    },
  });

  const onOpenChange = useCallback(
    (open: boolean) => {
      setOpen(open);
      if (open) {
        /*
        Its possible to set fields outside of this modal (by clicking the badge), but in that case the default values are already set - this sets them to correct value.
         */
        form.setFieldValue('public', collection.public);
        form.setFieldValue('forSale', collection.forSale ?? false);
        form.setFieldValue('forDecks', collection.forDecks ?? false);
      }
    },
    [collection.public, collection.forSale, collection.forDecks],
  );

  return (
    <Dialog
      trigger={trigger}
      header={`Edit ${cardListString.toLowerCase()}`}
      headerDescription="Update the details and choose how you share your cards."
      open={open}
      onOpenChange={onOpenChange}
    >
      {user ? (
        <form
          className={dialogStyles.form}
          onSubmit={e => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.Field
            name="title"
            children={field => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${inputId}-${field.name}`}>Title</Label>
                <Input
                  type="text"
                  id={`${inputId}-${field.name}`}
                  placeholder="Title"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                />
              </div>
            )}
          />
          <form.Field
            name="description"
            children={field => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${inputId}-${field.name}`}>
                  Description <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id={`${inputId}-${field.name}`}
                  placeholder="Description"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                />
              </div>
            )}
          />
          <form.Field
            name="public"
            children={field => (
              <DialogOption
                htmlFor={`${inputId}-public`}
                title="Public"
                description="Let other players view this list."
              >
                <Checkbox
                  id={`${inputId}-${field.name}`}
                  checked={field.state.value}
                  onBlur={field.handleBlur}
                  onCheckedChange={e => field.handleChange(!!e)}
                />
              </DialogOption>
            )}
          />
          {isCollection && (
            <>
              <form.Field
                name="forSale"
                children={field => (
                  <DialogOption
                    htmlFor={`${inputId}-forSale`}
                    title="Available for sale"
                    description="Show that cards in this collection are available for sale."
                  >
                    <Checkbox
                      id={`${inputId}-${field.name}`}
                      checked={field.state.value}
                      onBlur={field.handleBlur}
                      onCheckedChange={e => field.handleChange(!!e)}
                    />
                  </DialogOption>
                )}
              />
              <form.Field
                name="forDecks"
                children={field => (
                  <DialogOption
                    htmlFor={`${inputId}-forDecks`}
                    title="Use for deck building"
                    description="Include these cards when checking what you own for your decks."
                  >
                    <Checkbox
                      id={`${inputId}-${field.name}`}
                      checked={field.state.value}
                      onBlur={field.handleBlur}
                      onCheckedChange={e => field.handleChange(!!e)}
                    />
                  </DialogOption>
                )}
              />
            </>
          )}
          <div className={dialogStyles.formActions}>
            <Button
              type="button"
              variant="outline"
              disabled={putCollectionMutation.isPending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={putCollectionMutation.isPending}>
              {putCollectionMutation.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          Please sign in to update {cardListString.toLowerCase()}.
          <SignIn />
        </div>
      )}
    </Dialog>
  );
};

export default EditCollectionDialog;
