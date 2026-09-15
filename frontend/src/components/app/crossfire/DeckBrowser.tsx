import { useEffect, useState } from 'react';
import { Content as AccordionContent } from '@radix-ui/react-accordion';
import { Globe, History, Layers, Search } from 'lucide-react';
import { useCrossfireDecks } from '@/api/crossfire/useCrossfireDecks.ts';
import { Accordion, AccordionItem, AccordionTrigger } from '@/components/ui/accordion.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import type {
  CrossfireDeckSource,
  CrossfireDeckSummary,
} from '../../../../../shared/types/crossfire-decks.ts';
import type { CardList } from '../../../../../lib/swu-resources/types.ts';
import { DeckRow } from './DeckRow.tsx';
import { deckIdFromSearch } from './presentation.ts';

const sources = [
  { id: 'recent', label: 'Last played', icon: History },
  { id: 'mine', label: 'Your decks', icon: Layers },
  { id: 'public', label: 'Public decks', icon: Globe },
] as const;

type BrowserProps = {
  sessionId: string;
  selected?: string;
  disabled: boolean;
  catalog?: CardList;
  onSelect: (id: string) => void;
};

function DeckResults({
  source,
  search,
  typing,
  onBrowsePublic,
  ...props
}: BrowserProps & {
  source: CrossfireDeckSource;
  search: string;
  typing: boolean;
  onBrowsePublic: () => void;
}) {
  const query = useCrossfireDecks(props.sessionId, source, search);
  const rows = query.data?.pages.flatMap(page => page.data) ?? [];
  if (typing || query.isPending)
    return (
      <p className="cf-deck-message" role="status">
        {typing ? 'Searching…' : 'Loading decks…'}
      </p>
    );
  if (query.isError && !rows.length)
    return (
      <div className="cf-deck-message" role="alert">
        <p>Could not load these decks.</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </div>
    );
  if (!rows.length)
    return (
      <div className="cf-deck-message" role="status">
        <strong>
          {search
            ? 'No matching decks'
            : source === 'recent'
              ? 'Your first game is still ahead.'
              : source === 'mine'
                ? 'No saved decks yet.'
                : 'No public decks yet.'}
        </strong>
        <p>
          {search
            ? 'Try another deck, leader or base name.'
            : 'Choose another source or use a shared SWUBASE deck link.'}
        </p>
        {source !== 'public' && !search && (
          <Button type="button" variant="outline" size="sm" onClick={onBrowsePublic}>
            Browse public decks
          </Button>
        )}
      </div>
    );
  return (
    <>
      <div className="cf-deck-results">
        {rows.map(deck => (
          <DeckRow
            key={deck.id}
            deck={deck}
            selected={props.selected === deck.id}
            disabled={props.disabled}
            catalog={props.catalog}
            onSelect={props.onSelect}
          />
        ))}
      </div>
      {query.isError && (
        <p role="alert" className="cf-deck-message">
          Could not load more decks. Try again.
        </p>
      )}
      {query.hasNextPage && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full mt-2"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? 'Loading…' : 'Load more decks'}
        </Button>
      )}
    </>
  );
}

export function DeckBrowser(
  props: BrowserProps & {
    linked: boolean;
    selectedDeck?: CrossfireDeckSummary;
    selectedStatus: string;
    onSelectLink: (id: string) => void;
  },
) {
  const [source, setSource] = useState<string>(props.linked ? '' : 'recent');
  const selectLink = (id: string) => {
    props.onSelectLink(id);
    setSource('');
    setSearch('');
  };
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);
  return (
    <div className="cf-deck-picker">
      <div className="cf-deck-picker-heading">
        <h2>Choose your deck</h2>
      </div>
      <div className="cf-deck-search">
        <Input
          type="search"
          icon={Search}
          aria-label="Search decks or paste a deck link"
          placeholder="Search decks, leaders, bases or paste a deck link…"
          maxLength={120}
          autoComplete="off"
          value={search}
          onChange={e => {
            const id = deckIdFromSearch(e.target.value, window.location.origin);
            if (id && !props.disabled) {
              selectLink(id);
            } else setSearch(e.target.value);
          }}
          onPaste={e => {
            const id = deckIdFromSearch(
              e.clipboardData.getData('text/plain'),
              window.location.origin,
            );
            if (id && !props.disabled) {
              e.preventDefault();
              selectLink(id);
            }
          }}
        />
      </div>
      {props.linked && (
        <div className="cf-linked-deck" aria-label="Selected linked deck">
          {props.selectedDeck ? (
            <DeckRow
              deck={props.selectedDeck}
              selected
              disabled={props.disabled}
              catalog={props.catalog}
              onSelect={props.onSelectLink}
            />
          ) : (
            <p className="cf-deck-message" role="status">
              {props.selectedStatus}
            </p>
          )}
        </div>
      )}
      <Accordion
        type="single"
        collapsible
        value={source}
        onValueChange={setSource}
        className="cf-deck-groups"
      >
        {sources.map(({ id, label, icon: Icon }) => (
          <AccordionItem key={id} value={id} className="cf-deck-group">
            <AccordionTrigger right>
              <span className="flex items-center gap-3">
                <Icon size={16} />
                {label}
              </span>
            </AccordionTrigger>
            <AccordionContent className="cf-deck-source-panel" tabIndex={0}>
              <DeckResults
                {...props}
                source={id}
                search={debounced}
                typing={search.trim() !== debounced}
                onBrowsePublic={() => setSource('public')}
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
