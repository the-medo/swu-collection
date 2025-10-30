import Dialog, { DialogProps } from '@/components/app/global/Dialog.tsx';
import * as React from 'react';
import { useUser } from '@/hooks/useUser.ts';
import { useToast } from '@/hooks/use-toast.ts';
import { useForm } from '@tanstack/react-form';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useState } from 'react';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { Deck } from '../../../../../types/Deck.ts';
import { useDeleteDeck } from '@/api/decks/useDeleteDeck.ts';
import { Label } from '@/components/ui/label.tsx';
import { useNavigate } from '@tanstack/react-router';

type DeleteDeckDialogProps = Pick<DialogProps, 'trigger'> & {
  deck: Deck;
};

const DeleteDeckDialog: React.FC<DeleteDeckDialogProps> = ({ trigger, deck }) => {
  const navigate = useNavigate();
  const user = useUser();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const deleteDeckMutation = useDeleteDeck();

  const form = useForm({
    defaultValues: {
      confirmationText: '',
    },
    onSubmit: async ({ value }) => {
      if (value.confirmationText === 'DELETE') {
        deleteDeckMutation.mutate(deck.id, {
          onSuccess: () => {
            toast({
              title: `Deck deleted`,
            });
            setOpen(false);
            navigate({ to: `/decks/your` });
          },
        });
      } else {
        toast({
          variant: 'destructive',
          title: `Please type "DELETE" to confirm deletion of deck`,
          description: 'It needs to be in capital letters.',
        });
      }
    },
  });

  return (
    <Dialog
      trigger={trigger}
      header={`Delete Deck "${deck.name}"`}
      open={open}
      onOpenChange={setOpen}
    >
      <div className="text-sm">
        You are about to delete this deck. All contents will be deleted. This action cannot be
        undone. All links to this deck will no longer be valid.
      </div>
      {user ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={e => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <Label htmlFor="confirmationText">Please type "DELETE" to confirm deletion</Label>
          <form.Field
            name="confirmationText"
            children={field => (
              <div className="flex flex-col gap-2">
                <Input
                  type="text"
                  className=""
                  id={field.name}
                  placeholder=""
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                />
              </div>
            )}
          />
          <Button variant="destructive" type="submit" disabled={form.state.isSubmitting}>
            {form.state.isSubmitting ? '...' : 'Delete'}
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          Please sign in to delete deck.
          <SignIn />
        </div>
      )}
    </Dialog>
  );
};

export default DeleteDeckDialog;
