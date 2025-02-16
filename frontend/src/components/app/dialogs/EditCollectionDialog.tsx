import Dialog, { DialogProps } from '@/components/app/global/Dialog.tsx';
import * as React from 'react';
import { useUser } from '@/hooks/useUser.ts';
import { useToast } from '@/hooks/use-toast.ts';
import { useForm } from '@tanstack/react-form';
import { Label } from '@/components/ui/label.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { useCallback, useState } from 'react';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { Collection } from '../../../../../types/Collection.ts';
import { usePutCollection } from '@/api/usePutCollection.ts';

type EditCollectionDialogProps = Pick<DialogProps, 'trigger'> & {
  collection: Collection;
};

const EditCollectionDialog: React.FC<EditCollectionDialogProps> = ({ trigger, collection }) => {
  const wantlist = collection.wantlist;
  const user = useUser();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const collectionOrWantlist = wantlist ? 'Wantlist' : 'Collection';
  const putCollectionMutation = usePutCollection();

  const form = useForm<{
    title: string;
    description: string;
    public: boolean;
  }>({
    defaultValues: {
      title: collection.title ?? '',
      description: collection.description ?? '',
      public: collection.public ?? false,
    },
    onSubmit: async ({ value }) => {
      // Call our hook's mutation function.
      putCollectionMutation.mutate(
        {
          collectionId: collection.id,
          title: value.title,
          description: value.description,
          public: value.public,
        },
        {
          onSuccess: () => {
            toast({
              title: `${collectionOrWantlist} updated!`,
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
        Its possible to set public field outside of this modal (by clicking the badge), but in that case the default values are already set - this sets it to correct value.
         */
        form.setFieldValue('public', collection.public);
      }
    },
    [collection.public],
  );

  return (
    <Dialog
      trigger={trigger}
      header={`Edit ${collectionOrWantlist}`}
      open={open}
      onOpenChange={onOpenChange}
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
          <Button type="submit" disabled={form.state.isSubmitting}>
            {form.state.isSubmitting ? '...' : 'Update'}
          </Button>
        </form>
      ) : (
        <>
          Please sign in to update {collectionOrWantlist.toLowerCase()}.
          <SignIn />
        </>
      )}
    </Dialog>
  );
};

export default EditCollectionDialog;
