import Dialog, { DialogProps } from '@/components/app/global/Dialog.tsx';
import * as React from 'react';
import { useUser } from '@/hooks/useUser.ts';
import { useToast } from '@/hooks/use-toast.ts';
import { useForm } from '@tanstack/react-form';
import { Label } from '@/components/ui/label.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import SignIn from '@/components/app/auth/SignIn.tsx';
import VisibilitySelector from '@/components/app/global/VisibilitySelector/VisibilitySelector.tsx';
import { Visibility } from '../../../../../shared/types/visibility.ts';
import { useCallback, useState } from 'react';
import { useUpdateCardPool } from '@/api/card-pools/useUpdateCardPool.ts';
import { CardPool } from '../../../../../server/db/schema/card_pool.ts';

export type EditCardPoolDialogProps = Pick<DialogProps, 'trigger'> & {
  pool: CardPool;
};

const EditCardPoolDialog: React.FC<EditCardPoolDialogProps> = ({ trigger, pool }) => {
  const user = useUser();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const updatePoolMutation = useUpdateCardPool(pool.id);

  const form = useForm({
    defaultValues: {
      name: pool.name ?? '',
      description: pool.description ?? '',
      visibility: (pool.visibility as Visibility) ?? Visibility.Public,
    },
    onSubmit: async ({ value }) => {
      updatePoolMutation.mutate(
        {
          name: value.name,
          description: value.description,
          visibility: value.visibility,
        },
        {
          onSuccess: () => {
            toast({ title: 'Card pool updated!' });
            setOpen(false);
          },
        },
      );
    },
  });

  const onOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen) {
        form.setFieldValue('name', pool.name ?? '');
        form.setFieldValue('description', pool.description ?? '');
        form.setFieldValue('visibility', (pool.visibility as Visibility) ?? Visibility.Public);
      }
    },
    [pool.name, pool.description, pool.visibility],
  );

  return (
    <Dialog trigger={trigger} header={`Edit Card Pool`} open={open} onOpenChange={onOpenChange}>
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
            name="name"
            children={field => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Name</Label>
                <Input
                  type="text"
                  id={field.name}
                  placeholder="Card Pool Name"
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
                <Label htmlFor={field.name}>Description</Label>
                <Textarea
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
            name="visibility"
            children={field => (
              <VisibilitySelector
                value={field.state.value as Visibility}
                onChange={v => field.handleChange(v)}
              />
            )}
          />

          <Button type="submit" disabled={form.state.isSubmitting || updatePoolMutation.isPending}>
            {form.state.isSubmitting || updatePoolMutation.isPending ? '...' : 'Update'}
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          Please sign in to update this card pool.
          <SignIn />
        </div>
      )}
    </Dialog>
  );
};

export default EditCardPoolDialog;
