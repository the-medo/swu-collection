import { useState } from 'react';
import { useSession } from '@/lib/auth-client.ts';
import { useEditorDecks, useEditorDeck } from '@/api/rich-text-editor/useEditorDecks.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { deckIdFromSearch } from '@/components/app/crossfire/presentation.ts';
import { MatchupArtwork } from '@/components/app/global/MatchupCard.tsx';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs.tsx';
import type { DeckReference } from './model.ts';

function DeckChoices({
  source,
  selected,
  onSelect,
}: {
  source: 'mine' | 'public';
  selected?: string;
  onSelect: (id: string) => void;
}) {
  const session = useSession();
  const decks = useEditorDecks(source);
  const [search, setSearch] = useState('');
  const { data: catalog } = useCardList();
  if (session.isPending) return <p role="status">Loading account…</p>;
  if (source === 'mine' && !session.data)
    return (
      <div className="space-y-3 p-4">
        <p>Sign in to choose one of your decks, or browse public decks.</p>
        <SignIn forceTextButton />
      </div>
    );
  if (decks.isPending)
    return (
      <p role="status" className="p-4">
        Loading decks…
      </p>
    );
  if (decks.isError)
    return (
      <div role="alert" className="p-4">
        <p>Could not load decks.</p>
        <Button onClick={() => void decks.refetch()}>Try again</Button>
      </div>
    );
  const rows = decks.data.pages
    .flatMap(page => page.data)
    .filter(row => row.deck.name?.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <div className="space-y-2">
      <Input
        aria-label="Filter loaded decks"
        placeholder="Filter loaded decks by name…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div className="max-h-64 overflow-auto rounded-md border">
        {!rows.length && (
          <p className="p-4 text-sm text-muted-foreground">
            No decks here yet. Choose another source or paste a deck link.
          </p>
        )}
        {rows.map(({ deck, user }) => (
          <button
            type="button"
            key={deck.id}
            aria-pressed={selected === deck.id}
            onClick={() => onSelect(deck.id)}
            className="relative isolate flex min-h-20 w-full items-center overflow-hidden border-b p-3 text-left hover:bg-accent focus-visible:outline focus-visible:outline-ring aria-pressed:bg-accent"
          >
            <MatchupArtwork leaderCardId={deck.leaderCardId1} baseCardKey={deck.baseCardId} />
            <span className="relative ml-28 min-w-0">
              <strong className="block truncate">{deck.name || 'Untitled deck'}</strong>
              <span className="block text-xs text-muted-foreground">
                {deck.leaderCardId1 ? catalog?.cards[deck.leaderCardId1]?.name : 'No leader'} ·{' '}
                {user.name}
              </span>
            </span>
          </button>
        ))}
        {decks.hasNextPage && (
          <Button
            className="w-full"
            variant="ghost"
            disabled={decks.isFetchingNextPage}
            onClick={() => void decks.fetchNextPage()}
          >
            {decks.isFetchingNextPage ? 'Loading…' : 'Load more decks'}
          </Button>
        )}
      </div>
    </div>
  );
}

export function DeckPicker({ onSelect }: { onSelect: (deck: DeckReference) => void }) {
  const session = useSession();
  const [selected, setSelected] = useState<string>();
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState('');
  const liveDeck = useEditorDeck(selected);
  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={event => {
          event.preventDefault();
          const id = deckIdFromSearch(link, window.location.origin);
          setLinkError(id ? '' : 'Enter a SWUBASE deck URL or a valid deck ID.');
          if (id) setSelected(id);
        }}
      >
        <Input
          className="min-w-0 flex-1"
          aria-label="SWUBASE deck link or ID"
          placeholder="Paste a SWUBASE deck link or ID…"
          value={link}
          onChange={event => setLink(event.target.value)}
        />
        <Button type="submit" variant="outline">
          Find deck
        </Button>
      </form>
      {linkError && (
        <p role="alert" className="text-sm text-destructive">
          {linkError}
        </p>
      )}
      {session.isPending ? (
        <p role="status">Loading account…</p>
      ) : (
        <Tabs defaultValue={session.data ? 'mine' : 'public'}>
          <TabsList>
            <TabsTrigger value="mine">Your decks</TabsTrigger>
            <TabsTrigger value="public">Public decks</TabsTrigger>
          </TabsList>
          <TabsContent value="mine">
            <DeckChoices source="mine" selected={selected} onSelect={setSelected} />
          </TabsContent>
          <TabsContent value="public">
            <DeckChoices source="public" selected={selected} onSelect={setSelected} />
          </TabsContent>
        </Tabs>
      )}
      {selected && (
        <section data-deck-preview className="space-y-2 rounded-md border p-4">
          {liveDeck.isPending || liveDeck.isFetching ? (
            <p role="status">Loading decklist…</p>
          ) : liveDeck.isError ? (
            <div role="alert">
              <p>This deck is unavailable, or you do not have access to it.</p>
              <Button variant="outline" onClick={() => void liveDeck.refetch()}>
                Try again
              </Button>
            </div>
          ) : (
            <>
              <strong>{liveDeck.data.name}</strong>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                {(['Main deck', 'Sideboard', 'Maybeboard'] as const).map((label, index) => (
                  <span key={label}>
                    {label} (
                    {liveDeck.data.cards.reduce(
                      (count, card) => count + (card.board === index + 1 ? card.quantity : 0),
                      0,
                    )}
                    )
                  </span>
                ))}
              </div>
            </>
          )}
        </section>
      )}
      <div className="flex items-center justify-between gap-4 border-t pt-4">
        <p className="text-xs text-muted-foreground">
          Stores a deck link. The current decklist loads when the document opens.
        </p>
        <Button
          disabled={!liveDeck.data || liveDeck.isPending || liveDeck.isFetching || liveDeck.isError}
          onClick={() => liveDeck.data && onSelect({ deckId: liveDeck.data.deckId })}
        >
          Insert decklist
        </Button>
      </div>
    </div>
  );
}
