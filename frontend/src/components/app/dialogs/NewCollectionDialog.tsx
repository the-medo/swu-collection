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

type NewCollectionDialogProps = Pick<DialogProps, 'trigger' | 'triggerDisabled'> & {
  wantlist: boolean;
};

const NewCollectionDialog: React.FC<NewCollectionDialogProps> = ({
  trigger,
  triggerDisabled,
  wantlist,
}) => {
  const navigate = useNavigate();
  const user = useUser();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const collectionOrWantlist = wantlist ? 'Wantlist' : 'Collection';
  const postCollectionMutation = usePostCollection();

  const form = useForm<{
    title: string;
    description: string;
    public: boolean;
  }>({
    defaultValues: {
      title: `My ${collectionOrWantlist}`,
      description: ``,
      public: false,
    },
    onSubmit: async ({ value }) => {
      // Call our hook's mutation function.
      postCollectionMutation.mutate(
        {
          title: value.title,
          description: value.description,
          wantlist,
          public: value.public,
        },
        {
          onSuccess: result => {
            toast({
              title: `${collectionOrWantlist} "${value.title}" created!`,
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
      header={`New ${collectionOrWantlist}`}
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
                  value={field.state.value ? '1' : '0'}
                  onBlur={field.handleBlur}
                  onCheckedChange={e => field.handleChange(!!e)}
                />
                <Label htmlFor={field.name}>Public</Label>
              </div>
            )}
          />
          <Button type="submit" disabled={form.state.isSubmitting}>
            {form.state.isSubmitting ? '...' : 'Create'}
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          Please sign in to create new {collectionOrWantlist.toLowerCase()}.
          <SignIn />
        </div>
      )}
    </Dialog>
  );
};

export default NewCollectionDialog;
