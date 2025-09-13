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
  const postCollectionMutation = usePostCollection();

  const form = useForm<{
    title: string;
    description: string;
    public: boolean;
    forSale: boolean;
    forDecks: boolean;
  }>({
    defaultValues: {
      title: `My ${cardListString}`,
      description: ``,
      public: false,
      forSale: false,
      forDecks: false,
    },
    onSubmit: async ({ value }) => {
      // Call our hook's mutation function.
      postCollectionMutation.mutate(
        {
          title: value.title,
          description: value.description,
          collectionType,
          public: value.public,
          ...(collectionType === CollectionType.COLLECTION
            ? { forSale: value.forSale, forDecks: value.forDecks }
            : {}),
        },
        {
          onSuccess: result => {
            toast({
              title: `${cardListString} "${value.title}" created!`,
            });
            // Navigate to the newly created collection.
            const createdCollection = result.data[0];
            navigate({ to: `/collections/${createdCollection.id}` });
            setOpen(false);
          },
        },
      );
    },
  });

  return (
    <Dialog
      trigger={trigger}
      triggerDisabled={triggerDisabled}
      header={`New ${cardListString}`}
      open={open}
      onOpenChange={setOpen}
    >
      {user ? (
        <form
          className="flex flex-col gap-4"
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
                <Input
                  type="text"
                  className=""
                  id={field.name}
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
                <Textarea
                  className=""
                  id={field.name}
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
              <div className="flex gap-2">
                <Checkbox
                  id={field.name}
                  checked={field.state.value}
                  onBlur={field.handleBlur}
                  onCheckedChange={e => field.handleChange(!!e)}
                />
                <Label htmlFor={field.name}>Public</Label>
              </div>
            )}
          />
          {collectionType === CollectionType.COLLECTION && (
            <>
              <form.Field
                name="forSale"
                children={field => (
                  <div className="flex gap-2">
                    <Checkbox
                      id={field.name}
                      checked={field.state.value}
                      onBlur={field.handleBlur}
                      onCheckedChange={e => field.handleChange(!!e)}
                    />
                    <Label htmlFor={field.name}>For sale</Label>
                  </div>
                )}
              />
              <form.Field
                name="forDecks"
                children={field => (
                  <div className="flex gap-2">
                    <Checkbox
                      id={field.name}
                      checked={field.state.value}
                      onBlur={field.handleBlur}
                      onCheckedChange={e => field.handleChange(!!e)}
                    />
                    <Label htmlFor={field.name}>For decks</Label>
                  </div>
                )}
              />
            </>
          )}
          <Button type="submit" disabled={form.state.isSubmitting}>
            {form.state.isSubmitting ? '...' : 'Create'}
          </Button>
        </form>
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
