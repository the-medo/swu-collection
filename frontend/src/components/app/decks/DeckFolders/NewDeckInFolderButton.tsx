import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import NewDeckDialog from '@/components/app/dialogs/NewDeckDialog/NewDeckDialog.tsx';

export default function NewDeckInFolderButton({
  folderId,
  name,
}: {
  folderId: string | null;
  name: string;
}) {
  return (
    <NewDeckDialog
      initialFolderId={folderId}
      trigger={
        <Button
          variant="ghost"
          size="xs"
          aria-label={`New deck in ${name}`}
          className="h-7 gap-1 px-1 text-xs font-normal text-muted-foreground sm:px-2 [&_svg]:size-3.5"
        >
          <Plus />
          <span className="hidden sm:inline">New deck</span>
        </Button>
      }
    />
  );
}
