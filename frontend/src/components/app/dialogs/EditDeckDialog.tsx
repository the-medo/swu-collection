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
import { Deck } from '../../../../../types/Deck.ts';
import { usePutDeck } from '@/api/decks/usePutDeck.ts';
import FormatSelect from '@/components/app/decks/components/FormatSelect.tsx';

type EditDeckDialogProps = Pick<DialogProps, 'trigger'> & {
  deck: Deck;
};

const EditDeckDialog: React.FC<EditDeckDialogProps> = ({ trigger, deck }) => {
  const user = useUser();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const putDeckMutation = usePutDeck(deck.id);

  const form = useForm<{
    name: string;
    description: string;
    format: number;
    public: boolean;
  }>({
    defaultValues: {
      name: deck.name ?? '',
      description: deck.description ?? '',
      format: deck.format,
      public: deck.public ?? false,
    },
    onSubmit: async ({ value }) => {
      putDeckMutation.mutate(
        {
          name: value.name,
          description: value.description,
          format: value.format,
          public: value.public,
        },
        {
          onSuccess: () => {
            toast({
              title: `Deck updated!`,
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
        form.setFieldValue('public', deck.public);
        form.setFieldValue('format', deck.format);
      }
    },
    [deck.public, deck.format],
  );

  return (
    <Dialog trigger={trigger} header={`Edit Deck`} open={open} onOpenChange={onOpenChange}>
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
                  placeholder="Deck Name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                />
              </div>
            )}
          />
          <form.Field
            name="format"
            children={field => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Format</Label>
                <div>
                  <FormatSelect
                    value={field.state.value}
                    onChange={value => (value ? field.handleChange(value) : undefined)}
                    allowEmpty={false}
                  />
                </div>
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
          Please sign in to update deck.
          <SignIn />
        </>
      )}
    </Dialog>
  );
};

export default EditDeckDialog;
