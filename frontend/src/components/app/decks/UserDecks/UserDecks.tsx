import DeckTable from '../DeckTable/DeckTable.tsx';
import { useMemo, useState } from 'react';
import { UserDeckData } from '../DeckTable/deckTableLib.tsx';
import DeckFiltersAccordion from '@/components/app/decks/DeckFilters/DeckFiltersAccordion.tsx';
import {
  useDeckFilterStore,
  useInitializeDeckFilterFromUrlParams,
} from '@/components/app/decks/DeckFilters/useDeckFilterStore.ts';
import { useGetDecks } from '@/api/decks/useGetDecks.ts';
import { Button } from '@/components/ui/button.tsx';
import { Loader2, Trash2 } from 'lucide-react';
import type { OnChangeFn, RowSelectionState } from '@tanstack/react-table';
import DeleteDecksDialog from '@/components/app/dialogs/DeleteDecksDialog.tsx';
import { MAX_BULK_DECK_DELETE_COUNT } from '../../../../../../types/ZDeck.ts';
import { useSidebar } from '@/components/ui/sidebar.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';

interface UserDecksProps {
  userId: string | undefined;
  loading?: boolean;
  bulkDeleteEnabled?: boolean;
}

const UserDecks: React.FC<UserDecksProps> = ({
  userId,
  loading = false,
  bulkDeleteEnabled = false,
}) => {
  const initialized = useInitializeDeckFilterFromUrlParams();
  const { toRequestParams } = useDeckFilterStore();
  const { isMobile } = useSidebar();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const { data, isFetching, hasNextPage, fetchNextPage, isFetchingNextPage } = useGetDecks(
    toRequestParams(userId),
  );

  const decks: UserDeckData[] = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap(page => page.data || []);
  }, [data]);

  const isLoading = isFetching || loading;
  const selectedDecks = useMemo(
    () => decks.filter(({ deck }) => rowSelection[deck.id]),
    [decks, rowSelection],
  );
  const allLoadedDecksSelected =
    decks.length > 0 &&
    decks.slice(0, MAX_BULK_DECK_DELETE_COUNT).every(({ deck }) => rowSelection[deck.id]);

  const handleRowSelectionChange: OnChangeFn<RowSelectionState> = updater => {
    setRowSelection(current => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      const selectedEntries = Object.entries(next).filter(([, selected]) => selected);
      return Object.fromEntries(selectedEntries.slice(0, MAX_BULK_DECK_DELETE_COUNT));
    });
  };

  const toggleAllLoadedDecks = () => {
    setRowSelection(
      allLoadedDecksSelected
        ? {}
        : Object.fromEntries(
            decks.slice(0, MAX_BULK_DECK_DELETE_COUNT).map(({ deck }) => [deck.id, true]),
          ),
    );
  };

  if (!initialized) {
    return (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading{' '}
      </>
    );
  }

  return (
    <>
      <DeckFiltersAccordion initialized={initialized} />
      {bulkDeleteEnabled && isMobile && decks.length > 0 && (
        <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={allLoadedDecksSelected} onCheckedChange={toggleAllLoadedDecks} />
          Select {decks.length > MAX_BULK_DECK_DELETE_COUNT ? 'first 100' : 'all loaded'} decks
        </label>
      )}
      <DeckTable
        variant="user"
        decks={decks}
        loading={isLoading}
        selectable={bulkDeleteEnabled}
        selectionLimit={MAX_BULK_DECK_DELETE_COUNT}
        rowSelection={rowSelection}
        onRowSelectionChange={handleRowSelectionChange}
      />

      {hasNextPage && (
        <div className="flex justify-center mt-4">
          <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} variant="outline">
            {isFetchingNextPage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading more
              </>
            ) : (
              'Load more decks'
            )}
          </Button>
        </div>
      )}

      {bulkDeleteEnabled && selectedDecks.length > 0 && (
        <div className="fixed bottom-4 left-1/2 z-30 flex w-fit max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-lg border bg-background/95 p-2 shadow-lg backdrop-blur">
          <span className="px-1 text-sm font-medium">
            {selectedDecks.length} {selectedDecks.length === 1 ? 'deck' : 'decks'} selected
          </span>
          <Button type="button" variant="outline" size="sm" onClick={() => setRowSelection({})}>
            Clear
          </Button>
          <DeleteDecksDialog
            decks={selectedDecks.map(({ deck }) => deck)}
            onDeleted={() => setRowSelection({})}
            trigger={
              <Button type="button" variant="destructive" size="sm">
                <Trash2 className="h-4 w-4" />
                Delete selected
              </Button>
            }
          />
        </div>
      )}
    </>
  );
};

export default UserDecks;
