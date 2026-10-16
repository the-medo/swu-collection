import { useId, useState } from 'react';
import { Check, CheckCircle2, FolderHeart, Globe2, Layers3, Link2, Search } from 'lucide-react';
import { useSession } from '@/lib/auth-client.ts';
import { useEditorDecks, useEditorDeck } from '@/api/rich-text-editor/useEditorDecks.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { deckIdFromSearch } from '@/components/app/crossfire/presentation.ts';
import { MatchupArtwork } from '@/components/app/global/MatchupCard.tsx';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs.tsx';
import { cn } from '@/lib/utils.ts';
import { PickerBody, PickerFooter, PickerNotice } from './PickerLayout.tsx';
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
  if (session.isPending) return <PickerNotice title="Loading account…" loading />;
  if (source === 'mine' && !session.data)
    return (
      <PickerNotice title="Your decks, ready to share" icon={FolderHeart}>
        <p className="mb-3">Sign in to choose one of your decks, or browse public decks.</p>
        <SignIn forceTextButton />
      </PickerNotice>
    );
  if (decks.isPending) return <PickerNotice title="Loading decks…" loading />;
  if (decks.isError)
    return (
      <PickerNotice title="Could not load decks." error>
        <Button className="mt-2" variant="outline" onClick={() => void decks.refetch()}>
          Try again
        </Button>
      </PickerNotice>
    );
  const rows = decks.data.pages
    .flatMap(page => page.data)
    .filter(row => row.deck.name?.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
          aria-hidden
        />
        <Input
          className="h-10 rounded-xl pl-10"
          aria-label="Filter loaded decks"
          placeholder="Filter loaded decks by name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto overscroll-contain pr-1">
        {!rows.length && (
          <PickerNotice title={search ? 'No matching decks' : 'No decks here yet'} icon={Layers3}>
            {search
              ? 'Try another name or load more decks.'
              : 'Choose another source or paste a deck link below.'}
          </PickerNotice>
        )}
        {rows.map(({ deck, user }) => (
          <button
            key={deck.id}
            type="button"
            aria-pressed={selected === deck.id}
            onClick={() => onSelect(deck.id)}
            className={cn(
              'relative isolate flex min-h-24 w-full items-center gap-3 overflow-hidden rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
              selected === deck.id && 'border-primary/60 bg-primary/5',
            )}
          >
            <MatchupArtwork leaderCardId={deck.leaderCardId1} baseCardKey={deck.baseCardId} />
            <span className="relative ml-24 min-w-0 flex-1">
              <strong className="block truncate text-sm">{deck.name || 'Untitled deck'}</strong>
              <span className="mt-1 block truncate text-xs text-muted-foreground">
                {deck.leaderCardId1 ? catalog?.cards[deck.leaderCardId1]?.name : 'No leader'}
              </span>
              <span className="mt-1 block truncate text-xs text-muted-foreground">
                {user?.displayName ?? 'SWUBASE player'}
              </span>
            </span>
            <span
              aria-hidden
              className={cn(
                'relative grid size-6 shrink-0 place-items-center rounded-full border',
                selected === deck.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-muted-foreground/30',
              )}
            >
              {selected === deck.id && <Check className="size-3.5" />}
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
  const fieldId = useId();
  const [selected, setSelected] = useState<string>();
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState('');
  const liveDeck = useEditorDeck(selected);
  return (
    <>
      <PickerBody>
        {session.isPending ? (
          <PickerNotice title="Loading account…" loading />
        ) : (
          <Tabs defaultValue={session.data ? 'mine' : 'public'}>
            <TabsList className="mb-3 grid h-11 w-full grid-cols-2 rounded-xl p-1">
              <TabsTrigger className="gap-2 rounded-lg" value="mine">
                <FolderHeart className="size-4" aria-hidden />
                Your decks
              </TabsTrigger>
              <TabsTrigger className="gap-2 rounded-lg" value="public">
                <Globe2 className="size-4" aria-hidden />
                Public decks
              </TabsTrigger>
            </TabsList>
            <TabsContent value="mine">
              <DeckChoices source="mine" selected={selected} onSelect={setSelected} />
            </TabsContent>
            <TabsContent value="public">
              <DeckChoices source="public" selected={selected} onSelect={setSelected} />
            </TabsContent>
          </Tabs>
        )}
        <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
          <label htmlFor={fieldId} className="flex items-center gap-2 text-xs font-semibold">
            <Link2 className="size-4 text-muted-foreground" aria-hidden />
            SWUBASE deck link or ID
          </label>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={event => {
              event.preventDefault();
              const id = deckIdFromSearch(link, window.location.origin);
              setLinkError(id ? '' : 'Enter a SWUBASE deck URL or a valid deck ID.');
              if (id) setSelected(id);
            }}
          >
            <Input
              id={fieldId}
              className="min-w-0 flex-1 bg-background"
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
        </div>
        {selected && (
          <section
            data-deck-preview
            className="rounded-xl border border-primary/25 bg-primary/5 p-4"
          >
            {liveDeck.isPending || liveDeck.isFetching ? (
              <PickerNotice title="Loading decklist…" loading />
            ) : liveDeck.isError ? (
              <PickerNotice title="This deck is unavailable" error>
                <p>It may have been removed, or you may not have access to it.</p>
                <Button className="mt-3" variant="outline" onClick={() => void liveDeck.refetch()}>
                  Try again
                </Button>
              </PickerNotice>
            ) : (
              <div className="flex gap-3">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
                <div className="min-w-0 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Selected deck
                  </p>
                  <strong className="block break-words text-sm">{liveDeck.data.name}</strong>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {(['Main deck', 'Sideboard', 'Maybeboard'] as const).map((label, index) => (
                      <span key={label} className="rounded-md border bg-background/70 px-2 py-1">
                        {label} (
                        {liveDeck.data.cards.reduce(
                          (count, card) => count + (card.board === index + 1 ? card.quantity : 0),
                          0,
                        )}
                        )
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </PickerBody>
      <PickerFooter hint="Readers will see the latest decklist when they open your article.">
        <Button
          disabled={!liveDeck.data || liveDeck.isPending || liveDeck.isFetching || liveDeck.isError}
          onClick={() => liveDeck.data && onSelect({ deckId: liveDeck.data.deckId })}
        >
          <Layers3 className="size-4" aria-hidden />
          Insert decklist
        </Button>
      </PickerFooter>
    </>
  );
}
