import { ChevronDown, Folder, FolderOpen } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table.tsx';
import { cn } from '@/lib/utils.ts';
import type { GetDecksRequest } from '@/api/decks/useGetDecks.ts';
import FolderDeckList, {
  type FolderSelection,
  type FolderSelectionChange,
} from './FolderDeckList.tsx';

export default function UnfiledDeckSection({
  open,
  onToggle,
  filters,
  selection,
  onSelectionChange,
}: {
  open: boolean;
  onToggle: () => void;
  filters: GetDecksRequest;
  selection: FolderSelection;
  onSelectionChange: FolderSelectionChange;
}) {
  const Icon = open ? FolderOpen : Folder;

  return (
    <>
      <TableRow aria-label="No folder" className="h-16 border-border bg-muted/40 hover:bg-muted/60">
        <TableCell className="min-w-0 py-1">
          <div className="flex min-w-0 items-center gap-1">
            <span className="w-6 shrink-0" aria-hidden="true" />
            <button
              type="button"
              className="flex min-h-14 min-w-0 flex-1 items-center gap-1.5 py-2 text-left sm:gap-2"
              aria-label={`${open ? 'Collapse' : 'Expand'} decks with no folder`}
              aria-expanded={open}
              onClick={onToggle}
            >
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 transition-transform sm:h-5 sm:w-5',
                  !open && '-rotate-90',
                )}
              />
              <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md bg-foreground/5 sm:flex">
                <Icon className="h-4 w-4 text-muted-foreground sm:h-5 sm:w-5" />
              </span>
              <span className="min-w-0 break-words text-sm font-semibold sm:text-base">
                No folder
              </span>
            </button>
          </div>
        </TableCell>
        <TableCell />
        <TableCell />
      </TableRow>
      {open && (
        <tr>
          <td colSpan={3} className="p-0">
            <section aria-label="Decks with no folder" className="min-w-0 pb-4 pl-5 pt-2">
              <div className="min-w-0 overflow-x-auto pl-2 sm:pl-3">
                <FolderDeckList
                  filters={filters}
                  folderId="unfiled"
                  selection={selection}
                  onSelectionChange={onSelectionChange}
                />
              </div>
            </section>
          </td>
        </tr>
      )}
    </>
  );
}
