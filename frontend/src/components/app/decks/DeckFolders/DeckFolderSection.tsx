import {
  ChevronDown,
  Folder,
  FolderOpen,
  FolderPlus,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { TableCell, TableRow } from '@/components/ui/table.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import { cn } from '@/lib/utils.ts';
import type { GetDecksRequest } from '@/api/decks/useGetDecks.ts';
import {
  getDeckFolderDescendants,
  getDeckFolderPath,
} from '../../../../../../shared/lib/deckFolders.ts';
import type { DeckFolder } from '../../../../../../types/DeckFolder.ts';
import DeckFolderDialog from './DeckFolderDialog.tsx';
import DeleteDeckFolderDialog from './DeleteDeckFolderDialog.tsx';
import FolderDeckList, {
  type FolderSelection,
  type FolderSelectionChange,
} from './FolderDeckList.tsx';
import type { DeckFolderDrag } from './useDeckFolderDrag.ts';

type Props = {
  folders: DeckFolder[];
  folder: DeckFolder;
  filters: GetDecksRequest;
  opened: Set<string>;
  onToggle: (id: string) => void;
  onSaved: (id: string, parentId: string | null) => void;
  onDeleted: (id: string) => void;
  selection: FolderSelection;
  onSelectionChange: FolderSelectionChange;
  drag: DeckFolderDrag;
  depth?: number;
};

export default function DeckFolderSection(props: Props) {
  const {
    folders,
    folder,
    filters,
    opened,
    onToggle,
    onSaved,
    onDeleted,
    selection,
    onSelectionChange,
    drag,
    depth = 0,
  } = props;
  const open = opened.has(folder.id);
  const children = folders.filter(item => item.parentId === folder.id);
  const descendantIds = getDeckFolderDescendants(folders, folder.id);
  const deckCount = folders
    .filter(item => descendantIds.has(item.id))
    .reduce((sum, item) => sum + item.deckCount, 0);
  const Icon = open ? FolderOpen : Folder;
  const drop = drag.drag?.drop?.targetId === folder.id ? drag.drag.drop.placement : null;
  // Bound indentation for narrow and very deep trees, with a level label beyond the limit.
  const indent = `min(calc(${depth} * var(--folder-indent)), var(--folder-max-indent))`;
  const parents = getDeckFolderPath(folders, folder.id).slice(0, -1);
  const parentPath = parents.map(parent => parent.name).join(' / ');

  return (
    <>
      <TableRow
        aria-label={`Folder ${folder.name}`}
        data-folder-drop-row={folder.id}
        data-drop-placement={drop ?? undefined}
        className={cn(
          'h-16 border-border bg-muted/25 hover:bg-muted/40',
          depth === 0 && 'bg-muted/40 hover:bg-muted/60',
          drag.drag?.id === folder.id && 'opacity-40',
          drop === 'inside' &&
            'bg-foreground/10 outline outline-2 -outline-offset-2 outline-muted-foreground',
          drop === 'before' && 'border-t-2 border-t-muted-foreground',
          drop === 'after' && 'border-b-2 border-b-muted-foreground',
        )}
      >
        <TableCell className="relative min-w-0 py-1">
          <div className="relative flex min-w-0 items-center gap-1" style={{ paddingLeft: indent }}>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-6 shrink-0 touch-none cursor-grab active:cursor-grabbing"
              aria-label={`Move ${folder.name}`}
              aria-describedby="folder-drag-help"
              aria-disabled={drag.isPending}
              onPointerDown={event => drag.onPointerDown(event, folder.id)}
              onPointerMove={drag.onPointerMove}
              onPointerUp={drag.onPointerUp}
              onPointerCancel={drag.cancel}
              onLostPointerCapture={drag.cancel}
              onKeyDown={event => drag.onKeyDown(event, folder.id)}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </Button>
            <button
              type="button"
              className="flex min-h-14 min-w-0 flex-1 items-center gap-1.5 py-2 text-left sm:gap-2"
              aria-label={`${open ? 'Collapse' : 'Expand'} ${folder.name}`}
              aria-expanded={open}
              data-folder-toggle
              onClick={() => onToggle(folder.id)}
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
              <span className="min-w-0">
                {parentPath && (
                  <span
                    className="block text-[11px] leading-4 text-muted-foreground"
                    title={parentPath}
                  >
                    <span className="block truncate">{parents.at(-1)?.name}</span>
                    {depth > 2 && (
                      <span
                        className={cn(
                          'inline-block rounded bg-background/80 px-1 text-[10px]',
                          depth <= 8 && 'sm:hidden',
                        )}
                      >
                        Level {depth + 1}
                      </span>
                    )}
                  </span>
                )}
                <span className="block break-words text-sm font-semibold leading-snug sm:text-base">
                  {folder.name}
                </span>
              </span>
            </button>
          </div>
        </TableCell>
        <TableCell className="px-1 text-right sm:px-2">
          <span className="inline-flex min-w-7 justify-center rounded-md border border-border bg-background/80 px-1 py-1 text-xs font-semibold tabular-nums sm:px-2">
            {deckCount}
          </span>
        </TableCell>
        <TableCell className="px-1 sm:px-2">
          <div className="flex justify-end">
            <DeckFolderDialog
              folders={folders}
              parentId={folder.id}
              onSaved={onSaved}
              trigger={
                <Button
                  variant="ghost"
                  size="iconMedium"
                  className="w-6 sm:w-8"
                  aria-label={`New subfolder in ${folder.name}`}
                >
                  <FolderPlus className="h-4 w-4" />
                </Button>
              }
            />
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="iconMedium"
                  className="w-6 sm:w-8"
                  aria-label={`Actions for ${folder.name}`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DeckFolderDialog
                  folders={folders}
                  folder={folder}
                  onSaved={onSaved}
                  trigger={
                    <DropdownMenuItem onSelect={event => event.preventDefault()}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit folder
                    </DropdownMenuItem>
                  }
                />
                <DeleteDeckFolderDialog
                  folder={folder}
                  onDeleted={() => onDeleted(folder.id)}
                  trigger={
                    <DropdownMenuItem onSelect={event => event.preventDefault()}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove folder
                    </DropdownMenuItem>
                  }
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>
      {open && (
        <>
          {children.map(child => (
            <DeckFolderSection key={child.id} {...props} folder={child} depth={depth + 1} />
          ))}
          {(folder.deckCount > 0 || children.length === 0) && (
            <tr>
              <td colSpan={3} className="p-0">
                <section
                  aria-label={`Decks in ${folder.name}`}
                  className="relative min-w-0 pb-4 pt-2"
                  style={{ paddingLeft: `calc(20px + ${indent})` }}
                >
                  <div className="relative min-w-0 overflow-x-auto pl-2 sm:pl-3">
                    {children.length > 0 && (
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                        <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span>Decks in {folder.name}</span>
                      </div>
                    )}
                    <FolderDeckList
                      filters={filters}
                      folderId={folder.id}
                      selection={selection}
                      onSelectionChange={onSelectionChange}
                    />
                  </div>
                </section>
              </td>
            </tr>
          )}
        </>
      )}
    </>
  );
}
