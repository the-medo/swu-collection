import Dialog, { DialogProps } from '@/components/app/global/Dialog.tsx';
import * as React from 'react';
import { useUser } from '@/hooks/useUser.ts';
import { useToast } from '@/hooks/use-toast.ts';
import { useForm } from '@tanstack/react-form';
import { api } from '@/lib/api.ts';
import { Label } from '@/components/ui/label.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { useState } from 'react';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { useNavigate } from '@tanstack/react-router';

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

  const form = useForm<{
    title: string;
    public: boolean;
  }>({
    defaultValues: {
      title: `My ${collectionOrWantlist}`,
      public: false,
    },
    onSubmit: async ({ value }) => {
      api.collection
        .$post({
          json: {
            title: value.title,
            wantlist,
            public: value.public,
          },
        })
        .then(async res => {
          console.log(res);
          if (res.ok) {
            toast({
              title: `${collectionOrWantlist} "${value.title}" created!`,
            });
            const { data } = await res.json();
            await navigate({ to: `/collections/${data[0].id}` });
            setOpen(false);
          } else {
            throw new Error(res.statusText);
          }
        })
        .catch(e => {
          toast({
            variant: 'destructive',
            title: `Error while creating ${collectionOrWantlist}`,
            description: e.toString(),
          });
        });
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
        <>
          Please sign in to create new {collectionOrWantlist.toLowerCase()}.
          <SignIn />
        </>
      )}
    </Dialog>
  );
};

export default NewCollectionDialog;
