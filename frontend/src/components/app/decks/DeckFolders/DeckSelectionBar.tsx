import { useId, useState } from 'react';
import { FolderInput, Loader2, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Label } from '@/components/ui/label.tsx';
import { useMoveDecksToFolder } from '@/api/deck-folders/useMoveDecksToFolder.ts';
import { toast } from '@/hooks/use-toast.ts';
import DeleteDecksDialog from '@/components/app/dialogs/DeleteDecksDialog.tsx';
import DeckFolderSelect from './DeckFolderSelect.tsx';
import type { DeckFolder } from '../../../../../../types/DeckFolder.ts';
import type { Deck } from '../../../../../../types/Deck.ts';
import { cn } from '@/lib/utils.ts';

export default function DeckSelectionBar({
  folders,
  decks,
  disabled,
  onClear,
  onMoved,
}: {
  folders: DeckFolder[];
  decks: Deck[];
  disabled: boolean;
  onClear: () => void;
  onMoved: (folderId: string | null, deckIds: string[]) => void;
}) {
  const [folderId, setFolderId] = useState<string | null | undefined>();
  const folderInputId = useId();
  const move = useMoveDecksToFolder();
  const destinationMissing = !!folderId && !folders.some(folder => folder.id === folderId);
  const submit = async () => {
    if (move.isPending || disabled || destinationMissing || folderId === undefined) return;
    const deckIds = decks.map(deck => deck.id);
    try {
      await move.mutateAsync({ deckIds, folderId });
      onMoved(folderId, deckIds);
      toast({ title: `${deckIds.length} ${deckIds.length === 1 ? 'deck moved' : 'decks moved'}` });
    } catch {
      // Preserve the selection and destination for retry; the mutation displays the error.
    }
  };
  return (
    <div
      role="region"
      aria-label="Selected decks"
      className="fixed bottom-4 left-1/2 z-30 flex w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-col gap-x-6 gap-y-3 rounded-xl border bg-background/95 px-4 py-3 shadow-lg backdrop-blur sm:w-max sm:flex-row sm:flex-wrap sm:items-center sm:justify-center"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">
          {decks.length} {decks.length === 1 ? 'deck' : 'decks'} selected
        </span>
        <Button
          type="button"
          variant="ghost"
          size="iconSmall"
          aria-label="Clear selection"
          disabled={move.isPending}
          onClick={onClear}
        >
          <X />
        </Button>
      </div>
      {folders.length > 0 && (
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:flex-wrap sm:justify-center">
          <Label
            htmlFor={folderInputId}
            className="sr-only text-xs text-muted-foreground sm:not-sr-only"
          >
            Move to
          </Label>
          <DeckFolderSelect
            label="Destination folder"
            id={folderInputId}
            placeholder="Choose destination"
            folders={folders}
            value={folderId}
            onChange={setFolderId}
            disabled={disabled || move.isPending}
            className="h-9 w-full sm:w-52"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void submit()}
            disabled={disabled || move.isPending || destinationMissing || folderId === undefined}
          >
            {move.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FolderInput className="h-4 w-4" />
            )}
            {move.isPending ? 'Moving...' : 'Move decks'}
          </Button>
          {destinationMissing && (
            <span role="alert" className="col-span-2 text-xs text-destructive">
              Choose an available folder.
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          'flex items-center justify-end sm:justify-start',
          folders.length > 0 && 'border-t pt-2 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0',
        )}
      >
        <DeleteDecksDialog
          decks={decks}
          onDeleted={onClear}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              disabled={move.isPending}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete selected
            </Button>
          }
        />
      </div>
    </div>
  );
}
