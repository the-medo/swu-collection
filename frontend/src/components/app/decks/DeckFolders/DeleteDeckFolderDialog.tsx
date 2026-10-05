import { useState } from 'react';
import Dialog from '@/components/app/global/Dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useDeleteDeckFolder } from '@/api/deck-folders/useDeleteDeckFolder.ts';
import { toast } from '@/hooks/use-toast.ts';
import type { DeckFolder } from '../../../../../../types/DeckFolder.ts';

export default function DeleteDeckFolderDialog({
  folder,
  trigger,
  onDeleted,
}: {
  folder: DeckFolder;
  trigger: React.ReactNode;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const remove = useDeleteDeckFolder();
  const submit = async () => {
    try {
      await remove.mutateAsync(folder.id);
      setOpen(false);
      onDeleted();
      toast({ title: 'Folder removed', description: 'Its decks are now shown under No folder.' });
    } catch {
      // The mutation displays the error; preserve the dialog for retry.
    }
  };
  return (
    <Dialog
      trigger={trigger}
      header={`Remove “${folder.name}”?`}
      open={open}
      onOpenChange={next => {
        if (!remove.isPending) setOpen(next);
      }}
      headerDescription="This also removes its subfolders. All decks are kept and shown under No folder."
    >
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" disabled={remove.isPending} onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button variant="destructive" disabled={remove.isPending} onClick={() => void submit()}>
          {remove.isPending ? 'Removing...' : 'Remove folder'}
        </Button>
      </div>
    </Dialog>
  );
}
