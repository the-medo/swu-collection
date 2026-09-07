import Dialog, { DialogProps } from '@/components/app/global/Dialog.tsx';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { useDeleteDecks } from '@/api/decks/useDeleteDecks.ts';
import { useToast } from '@/hooks/use-toast.ts';
import { useUser } from '@/hooks/useUser.ts';
import type { Deck } from '../../../../../types/Deck.ts';
import { useState } from 'react';

type DeleteDecksDialogProps = Pick<DialogProps, 'trigger'> & {
  decks: Deck[];
  onDeleted: () => void;
};

const DeleteDecksDialog: React.FC<DeleteDecksDialogProps> = ({ trigger, decks, onDeleted }) => {
  const [open, setOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const user = useUser();
  const { toast } = useToast();
  const deleteDecksMutation = useDeleteDecks();

  const deckLabel = decks.length === 1 ? 'deck' : 'decks';

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setConfirmationText('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (confirmationText !== 'DELETE') {
      toast({
        variant: 'destructive',
        title: `Please type "DELETE" to confirm deletion of ${deckLabel}`,
        description: 'It needs to be in capital letters.',
      });
      return;
    }

    try {
      await deleteDecksMutation.mutateAsync(decks.map(deck => deck.id));
      toast({ title: `${decks.length} ${deckLabel} deleted` });
      handleOpenChange(false);
      onDeleted();
    } catch {
      // The mutation displays the API error. Keep the dialog and selection open for retry.
    }
  };

  return (
    <Dialog
      trigger={trigger}
      triggerDisabled={decks.length === 0}
      header={`Delete ${decks.length} selected ${deckLabel}?`}
      open={open}
      onOpenChange={handleOpenChange}
    >
      <div className="flex flex-col gap-4 text-sm">
        <p>
          All contents of the selected {deckLabel} will be deleted. This action cannot be undone,
          and existing links will no longer be valid.
        </p>
        <ul className="max-h-32 list-disc overflow-y-auto pl-5 text-muted-foreground">
          {decks.slice(0, 8).map(deck => (
            <li key={deck.id}>{deck.name}</li>
          ))}
          {decks.length > 8 && <li>and {decks.length - 8} more</li>}
        </ul>
        {user ? (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Label htmlFor="bulk-deck-deletion-confirmation">
              Please type "DELETE" to confirm deletion
            </Label>
            <Input
              id="bulk-deck-deletion-confirmation"
              value={confirmationText}
              onChange={event => setConfirmationText(event.target.value)}
              autoComplete="off"
            />
            <Button variant="destructive" type="submit" disabled={deleteDecksMutation.isPending}>
              {deleteDecksMutation.isPending
                ? 'Deleting...'
                : `Delete ${decks.length} ${deckLabel}`}
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            Please sign in to delete decks.
            <SignIn />
          </div>
        )}
      </div>
    </Dialog>
  );
};

export default DeleteDecksDialog;
