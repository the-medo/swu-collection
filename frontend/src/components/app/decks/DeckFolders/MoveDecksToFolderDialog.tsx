import { useId, useState } from 'react';
import Dialog from '@/components/app/global/Dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Label } from '@/components/ui/label.tsx';
import { useMoveDecksToFolder } from '@/api/deck-folders/useMoveDecksToFolder.ts';
import { toast } from '@/hooks/use-toast.ts';
import { getDeckFolderOptions } from '../../../../../../shared/lib/deckFolders.ts';
import type { DeckFolder } from '../../../../../../types/DeckFolder.ts';

export default function MoveDecksToFolderDialog({
  folders,
  deckIds,
  trigger,
  onMoved,
}: {
  folders: DeckFolder[];
  deckIds: string[];
  trigger: React.ReactNode;
  onMoved: (folderId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [folderId, setFolderId] = useState('');
  const inputId = useId();
  const move = useMoveDecksToFolder();
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await move.mutateAsync({ deckIds, folderId: folderId || null });
      setOpen(false);
      onMoved(folderId || null);
      toast({ title: `${deckIds.length} ${deckIds.length === 1 ? 'deck moved' : 'decks moved'}` });
    } catch {
      // Preserve selection and destination when a request fails.
    }
  };
  return (
    <Dialog
      trigger={trigger}
      header={`Move ${deckIds.length} selected ${deckIds.length === 1 ? 'deck' : 'decks'}`}
      headerDescription="Choose a folder, including a subfolder, or select No folder."
      open={open}
      onOpenChange={next => {
        if (!move.isPending) {
          setOpen(next);
          if (next) setFolderId('');
        }
      }}
    >
      <form className="flex flex-col gap-4" onSubmit={event => void submit(event)}>
        <Label htmlFor={inputId}>Destination folder</Label>
        <select
          id={inputId}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={folderId}
          disabled={move.isPending}
          onChange={event => setFolderId(event.target.value)}
        >
          <option value="">No folder</option>
          {getDeckFolderOptions(folders).map(option => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={move.isPending}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={move.isPending || !deckIds.length}>
            {move.isPending ? 'Moving...' : 'Move decks'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
