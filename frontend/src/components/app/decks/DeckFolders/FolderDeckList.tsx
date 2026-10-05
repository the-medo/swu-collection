import { memo, useMemo } from 'react';
import type { OnChangeFn, RowSelectionState } from '@tanstack/react-table';
import { useGetDecks, type GetDecksRequest } from '@/api/decks/useGetDecks.ts';
import DeckTable from '@/components/app/decks/DeckTable/DeckTable.tsx';
import type { UserDeckData } from '@/components/app/decks/DeckTable/deckTableLib.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { useSidebar } from '@/components/ui/sidebar.tsx';
import { Loader2 } from 'lucide-react';
import type { Deck } from '../../../../../../types/Deck.ts';
import { MAX_BULK_DECK_DELETE_COUNT } from '../../../../../../types/ZDeck.ts';

export type FolderSelection = Record<string, Deck>;
export type FolderSelectionChange = (
  decks: UserDeckData[],
  updater: Parameters<OnChangeFn<RowSelectionState>>[0],
) => void;

function FolderDeckList({
  filters,
  folderId,
  selection,
  onSelectionChange,
}: {
  filters: GetDecksRequest;
  folderId: string;
  selection: FolderSelection;
  onSelectionChange: FolderSelectionChange;
}) {
  const query = useGetDecks({ ...filters, folderId });
  const { isMobile } = useSidebar();
  const decks: UserDeckData[] = useMemo(
    () => query.data?.pages.flatMap(page => page.data ?? []) ?? [],
    [query.data],
  );
  const loadedIds = new Set(decks.map(row => row.deck.id));
  const limit =
    MAX_BULK_DECK_DELETE_COUNT - Object.keys(selection).filter(id => !loadedIds.has(id)).length;
  const rowSelection = Object.fromEntries(Object.keys(selection).map(id => [id, true]));
  const onChange: OnChangeFn<RowSelectionState> = updater => onSelectionChange(decks, updater);
  const eligible = decks.slice(0, limit);
  const allSelected = eligible.length > 0 && eligible.every(row => selection[row.deck.id]);

  if (query.isError)
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2 p-4 text-sm">
        <span>Could not load these decks: {query.error.message}</span>
        <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </div>
    );

  if (!query.isPending && decks.length === 0)
    return (
      <p className="p-4 text-sm text-muted-foreground">No decks here match the current filters.</p>
    );

  return (
    <div className="min-w-0">
      {isMobile && decks.length > 0 && (
        <label className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
          <Checkbox
            checked={allSelected}
            disabled={limit === 0}
            onCheckedChange={checked =>
              onChange(checked ? Object.fromEntries(eligible.map(row => [row.deck.id, true])) : {})
            }
          />
          Select loaded decks
        </label>
      )}
      <DeckTable
        variant="user"
        decks={decks}
        loading={query.isPending}
        selectable
        selectionLimit={limit}
        rowSelection={rowSelection}
        onRowSelectionChange={onChange}
      />
      {query.hasNextPage && (
        <div className="flex justify-center p-3">
          <Button
            variant="outline"
            size="sm"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {query.isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />}
            {query.isFetchingNextPage ? 'Loading...' : 'Load more decks'}
          </Button>
        </div>
      )}
    </div>
  );
}

export default memo(FolderDeckList);
