import { useCardList } from '@/api/lists/useCardList.ts';
import { useEditorDecks } from '@/api/rich-text-editor/useEditorDecks.ts';
import { useCrossfireDecks } from '@/api/crossfire/useCrossfireDecks.ts';
import { Button } from '@/components/ui/button.tsx';
import { DeckPickerRow, type DeckPickerChoice } from './DeckPickerRow.tsx';

export type DeckPickerSource = 'mine' | 'public' | 'recent';
export type DeckPickerSelectionProps = {
  selected?: string;
  disabled?: boolean;
  onSelect: (id: string) => void;
  crossfireSessionId?: string;
};

export function DeckPickerResults({
  source,
  folderId,
  search,
  ...props
}: DeckPickerSelectionProps & { source: DeckPickerSource; folderId?: string; search: string }) {
  const editor = useEditorDecks(
    source === 'public' ? 'public' : 'mine',
    folderId,
    !props.crossfireSessionId && source !== 'recent',
  );
  const crossfire = useCrossfireDecks(
    props.crossfireSessionId ?? '',
    source,
    search,
    !!props.crossfireSessionId,
    folderId,
  );
  const { data: catalog } = useCardList();
  const query = props.crossfireSessionId ? crossfire : editor;
  const rows: DeckPickerChoice[] = props.crossfireSessionId
    ? (crossfire.data?.pages.flatMap(page => page.data) ?? [])
    : (editor.data?.pages
        .flatMap(page =>
          page.data.map(({ deck, user }) => ({
            id: deck.id,
            name: deck.name,
            leaderId: deck.leaderCardId1,
            baseId: deck.baseCardId,
            author: user?.displayName,
          })),
        )
        .filter(deck => {
          const text = [
            deck.name,
            catalog?.cards[deck.leaderId ?? '']?.name,
            catalog?.cards[deck.baseId ?? '']?.name,
          ]
            .join(' ')
            .toLowerCase();
          return text.includes(search.toLowerCase());
        }) ?? []);

  if (query.isPending)
    return (
      <p role="status" className="p-3 text-xs text-muted-foreground">
        Loading decks…
      </p>
    );
  return (
    <div className="space-y-1.5">
      {query.isError && (
        <div role="alert" className="flex flex-wrap items-center gap-2 p-3 text-xs">
          Could not load {rows.length ? 'more ' : ''}decks.
          <Button type="button" variant="outline" size="sm" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      )}
      {!rows.length && !query.isError && (
        <p role="status" className="p-3 text-xs text-muted-foreground">
          {search
            ? 'No matching decks.'
            : source === 'recent'
              ? 'No decks played yet.'
              : 'No decks here yet.'}
        </p>
      )}
      {rows.map(deck => (
        <DeckPickerRow
          key={deck.id}
          deck={deck}
          selected={props.selected === deck.id}
          disabled={props.disabled}
          onSelect={props.onSelect}
        />
      ))}
      {search && !props.crossfireSessionId && query.hasNextPage && (
        <p className="px-2 text-[11px] text-muted-foreground">
          Filtering loaded decks. Load more to search further.
        </p>
      )}
      {query.hasNextPage && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? 'Loading…' : 'Load more decks'}
        </Button>
      )}
    </div>
  );
}
