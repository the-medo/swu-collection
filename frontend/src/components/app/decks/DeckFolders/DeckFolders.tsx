import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils.ts';
import { FolderInput, FolderPlus, Loader2, Trash2 } from 'lucide-react';
import { useDeckFolders } from '@/api/deck-folders/useDeckFolders.ts';
import { Button } from '@/components/ui/button.tsx';
import DeckFiltersAccordion from '@/components/app/decks/DeckFilters/DeckFiltersAccordion.tsx';
import {
  useDeckFilterStore,
  useInitializeDeckFilterFromUrlParams,
} from '@/components/app/decks/DeckFilters/useDeckFilterStore.ts';
import NewDeckDialog from '@/components/app/dialogs/NewDeckDialog/NewDeckDialog.tsx';
import DeleteDecksDialog from '@/components/app/dialogs/DeleteDecksDialog.tsx';
import { MAX_BULK_DECK_DELETE_COUNT } from '../../../../../../types/ZDeck.ts';
import {
  getDeckFolderDescendants,
  getDeckFolderPath,
} from '../../../../../../shared/lib/deckFolders.ts';
import DeckFolderDialog from './DeckFolderDialog.tsx';
import DeckFolderSection from './DeckFolderSection.tsx';
import { type FolderSelection, type FolderSelectionChange } from './FolderDeckList.tsx';
import MoveDecksToFolderDialog from './MoveDecksToFolderDialog.tsx';
import {
  readOpenDeckFolders,
  readUnfiledOpen,
  writeOpenDeckFolders,
  writeUnfiledOpen,
} from './openFoldersStorage.ts';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table.tsx';
import { useDeckFolderDrag } from './useDeckFolderDrag.ts';
import UnfiledDeckSection from './UnfiledDeckSection.tsx';

export default function DeckFolders({ userId }: { userId: string }) {
  const initialized = useInitializeDeckFilterFromUrlParams();
  const { toRequestParams } = useDeckFilterStore();
  const query = useDeckFolders(userId);
  const folders = query.data ?? [];
  const [storedOpened, setOpened] = useState(() => readOpenDeckFolders(userId));
  const [unfiledOpen, setUnfiledOpen] = useState(() => readUnfiledOpen(userId));
  const opened = useMemo(() => {
    if (!query.data) return storedOpened;
    const known = new Set(query.data.map(folder => folder.id));
    return new Set([...storedOpened].filter(id => known.has(id)));
  }, [query.data, storedOpened]);
  const [selection, setSelection] = useState<FolderSelection>({});
  const filters = useMemo(() => toRequestParams(userId), [toRequestParams, userId]);
  const filterKey = JSON.stringify(filters);
  const [selectedFilterKey, setSelectedFilterKey] = useState(filterKey);

  // Keep selection across folders and pages, but clear it when the visible filters change.
  if (selectedFilterKey !== filterKey) {
    setSelectedFilterKey(filterKey);
    setSelection({});
  }

  useEffect(() => {
    if (query.data) writeOpenDeckFolders(userId, opened);
  }, [query.data, userId, opened]);
  useEffect(() => {
    writeUnfiledOpen(userId, unfiledOpen);
  }, [userId, unfiledOpen]);

  const changeOpened = (update: (current: Set<string>) => Set<string>) =>
    setOpened(current => {
      const next = update(new Set(current));
      return next;
    });
  const revealFolder = (id: string | null) => {
    if (!id) {
      setUnfiledOpen(true);
      return;
    }
    changeOpened(current => {
      getDeckFolderPath(folders, id).forEach(folder => current.add(folder.id));
      current.add(id);
      return current;
    });
  };
  const onSaved = (id: string, parentId: string | null) => {
    changeOpened(current => {
      if (parentId) getDeckFolderPath(folders, parentId).forEach(folder => current.add(folder.id));
      current.add(id);
      return current;
    });
  };
  const { attachPreview, ...drag } = useDeckFolderDrag(folders, (_id, parentId) => {
    if (parentId) revealFolder(parentId);
  });
  const onSelectionChange = useCallback<FolderSelectionChange>(
    (decks, updater) =>
      setSelection(current => {
        const values = Object.fromEntries(Object.keys(current).map(id => [id, true]));
        const nextValues = typeof updater === 'function' ? updater(values) : updater;
        const next = { ...current };
        for (const { deck } of decks) {
          if (!nextValues[deck.id]) delete next[deck.id];
          else if (next[deck.id] || Object.keys(next).length < MAX_BULK_DECK_DELETE_COUNT)
            next[deck.id] = deck;
        }
        return next;
      }),
    [],
  );
  const selectedDecks = Object.values(selection);

  return (
    <div className="flex w-full min-w-0 flex-col gap-3 p-2 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="mb-0">Your decks</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            disabled={!opened.size && !unfiledOpen}
            onClick={() => {
              changeOpened(() => new Set());
              setUnfiledOpen(false);
            }}
          >
            Collapse all folders
          </Button>
          <DeckFolderDialog
            folders={folders}
            onSaved={onSaved}
            trigger={
              <Button variant="outline" disabled={query.isPending || query.isError}>
                <FolderPlus className="h-4 w-4" />
                New folder
              </Button>
            }
          />
          <NewDeckDialog trigger={<Button>New deck</Button>} />
        </div>
      </div>
      <DeckFiltersAccordion initialized={initialized} />
      {query.isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading folders...
        </div>
      )}
      {query.isError && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
          Could not load folders: {query.error.message}
          <Button size="sm" variant="outline" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      )}
      {initialized && (
        <>
          <p id="folder-drag-help" className="sr-only">
            Drag between rows to reorder, or onto a folder to nest it. On a drag handle, use Up or
            Down to reorder, Right to nest under the previous folder, or Left to move out.
          </p>
          {drag.drag && (
            <div
              data-folder-drop-root
              className={cn(
                'sticky top-0 z-40 -mb-11 flex h-8 shrink-0 items-center bg-background px-2 text-sm text-muted-foreground',
                drag.drag.drop?.targetId === null && 'outline outline-2 outline-muted-foreground',
              )}
            >
              Drop here to move to the top level
            </div>
          )}
          <Table
            aria-label="Deck folders"
            className="table-fixed [--folder-indent:16px] [--folder-max-indent:32px] sm:[--folder-indent:28px] sm:[--folder-max-indent:224px]"
          >
            <TableHeader>
              <TableRow>
                <TableHead>Folder</TableHead>
                <TableHead className="w-12 px-1 text-right sm:w-14 sm:px-2">Decks</TableHead>
                <TableHead className="w-14 px-1 text-right sm:w-20 sm:px-2">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!query.isError &&
                folders
                  .filter(folder => !folder.parentId)
                  .map(folder => (
                    <DeckFolderSection
                      key={folder.id}
                      folder={folder}
                      folders={folders}
                      filters={filters}
                      opened={opened}
                      onToggle={id =>
                        changeOpened(current => {
                          if (current.has(id)) current.delete(id);
                          else current.add(id);
                          return current;
                        })
                      }
                      onSaved={onSaved}
                      drag={drag}
                      onDeleted={id => {
                        const removed = getDeckFolderDescendants(folders, id);
                        changeOpened(current => {
                          removed.forEach(folderId => current.delete(folderId));
                          return current;
                        });
                        setSelection({});
                      }}
                      selection={selection}
                      onSelectionChange={onSelectionChange}
                    />
                  ))}
              <UnfiledDeckSection
                open={unfiledOpen}
                onToggle={() => setUnfiledOpen(current => !current)}
                filters={filters}
                selection={selection}
                onSelectionChange={onSelectionChange}
              />
            </TableBody>
          </Table>
          <div aria-live="polite" className="sr-only">
            {drag.drag ? drag.description : drag.isPending ? 'Saving folder position' : ''}
          </div>
          {drag.drag && (
            <div
              ref={attachPreview}
              className="pointer-events-none fixed z-50 w-80 max-w-[calc(100vw-1rem)] break-words rounded-md border bg-background px-3 py-2 text-sm shadow-lg"
            >
              {drag.description}
            </div>
          )}
        </>
      )}
      {selectedDecks.length > 0 && (
        <div className="fixed bottom-4 left-1/2 z-30 flex w-fit max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-lg border bg-background/95 p-2 shadow-lg backdrop-blur">
          <span className="px-1 text-sm font-medium">
            {selectedDecks.length} {selectedDecks.length === 1 ? 'deck' : 'decks'} selected
          </span>
          <Button variant="outline" size="sm" onClick={() => setSelection({})}>
            Clear
          </Button>
          <MoveDecksToFolderDialog
            folders={folders}
            deckIds={selectedDecks.map(deck => deck.id)}
            onMoved={id => {
              setSelection({});
              revealFolder(id);
            }}
            trigger={
              <Button variant="outline" size="sm" disabled={query.isPending || query.isError}>
                <FolderInput className="h-4 w-4" />
                Move to folder
              </Button>
            }
          />
          <DeleteDecksDialog
            decks={selectedDecks}
            onDeleted={() => setSelection({})}
            trigger={
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4" />
                Delete selected
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
}
