import { useEffect, useRef, useState } from 'react';
import { FolderHeart, Globe2, History, Search, X } from 'lucide-react';
import { useSession } from '@/lib/auth-client.ts';
import { useCrossfireDecks } from '@/api/crossfire/useCrossfireDecks.ts';
import { deckIdFromSearch } from '@/components/app/crossfire/presentation.ts';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs.tsx';
import { cn } from '@/lib/utils.ts';
import { DeckPickerFolders } from './DeckPickerFolders.tsx';
import {
  DeckPickerResults,
  type DeckPickerSelectionProps,
  type DeckPickerSource,
} from './DeckPickerResults.tsx';

type Props = DeckPickerSelectionProps & {
  onSelectLink?: (id: string) => void;
  fillHeight?: boolean;
};

function PickerContent(props: Props & { userId?: string }) {
  const [chosenSource, setSource] = useState<DeckPickerSource>();
  const [search, setSearch] = useState('');
  const searchInput = useRef<HTMLInputElement>(null);
  const [debounced, setDebounced] = useState('');
  const recent = useCrossfireDecks(
    props.crossfireSessionId ?? '',
    'recent',
    '',
    !!props.crossfireSessionId,
  );
  const source =
    chosenSource ??
    (props.crossfireSessionId
      ? recent.isSuccess && !recent.data.pages[0]?.data.length
        ? 'mine'
        : 'recent'
      : props.userId
        ? 'mine'
        : 'public');
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);
  const selectLink = (text: string) => {
    const id = deckIdFromSearch(text, window.location.origin);
    if (!id || props.disabled) return false;
    (props.onSelectLink ?? props.onSelect)(id);
    setSearch('');
    return true;
  };
  return (
    <div
      className={cn('flex min-h-0 min-w-0 flex-col gap-2', props.fillHeight && 'flex-1')}
      data-deck-picker
    >
      <div className="relative shrink-0">
        <Input
          ref={searchInput}
          type="search"
          icon={Search}
          className="h-9 pl-9 pr-9 [&::-webkit-search-cancel-button]:appearance-none"
          maxLength={120}
          autoComplete="off"
          aria-label="Search decks or paste a deck link"
          placeholder="Deck, leader, base or SWUBASE deck link…"
          value={search}
          disabled={props.disabled}
          onChange={event => {
            if (!selectLink(event.target.value)) setSearch(event.target.value);
          }}
          onPaste={event => {
            if (selectLink(event.clipboardData.getData('text/plain'))) event.preventDefault();
          }}
        />
        {search && (
          <Button
            type="button"
            variant="ghost"
            size="iconSmall"
            className="absolute right-1 top-0.5"
            aria-label="Clear deck search"
            disabled={props.disabled}
            onClick={() => {
              setSearch('');
              searchInput.current?.focus();
            }}
          >
            <X size={14} />
          </Button>
        )}
      </div>
      <Tabs
        className="flex min-h-0 flex-1 flex-col"
        value={source}
        onValueChange={value => setSource(value as DeckPickerSource)}
      >
        <TabsList
          className={cn(
            'grid h-9 w-full shrink-0 gap-1 rounded-lg p-1',
            props.crossfireSessionId ? 'grid-cols-3' : 'grid-cols-2',
          )}
        >
          {props.crossfireSessionId && (
            <TabsTrigger className="gap-1.5 px-2 text-xs" value="recent">
              <History size={14} aria-hidden />
              Last played
            </TabsTrigger>
          )}
          <TabsTrigger className="gap-1.5 px-2 text-xs" value="mine">
            <FolderHeart size={14} aria-hidden />
            Your decks
          </TabsTrigger>
          <TabsTrigger className="gap-1.5 px-2 text-xs" value="public">
            <Globe2 size={14} aria-hidden />
            Public decks
          </TabsTrigger>
        </TabsList>
        {(['recent', 'mine', 'public'] as const)
          .filter(value => value !== 'recent' || props.crossfireSessionId)
          .map(value => (
            <TabsContent
              key={value}
              value={value}
              className={cn(
                'mt-2 overflow-y-auto overscroll-contain rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                props.fillHeight ? 'min-h-0 flex-1' : 'max-h-80 min-h-20',
              )}
              tabIndex={0}
            >
              {value === 'mine' && !props.userId ? (
                <div className="space-y-3 p-4 text-center text-xs text-muted-foreground">
                  Sign in to choose one of your decks.
                  <SignIn forceTextButton />
                </div>
              ) : search.trim() !== debounced ? (
                <p role="status" className="p-3 text-xs text-muted-foreground">
                  Searching…
                </p>
              ) : value === 'mine' && !debounced && props.userId ? (
                <DeckPickerFolders {...props} userId={props.userId} />
              ) : (
                <DeckPickerResults {...props} source={value} search={debounced} />
              )}
            </TabsContent>
          ))}
      </Tabs>
    </div>
  );
}

/** Shared selector for editor insertion and Crossfire; callers own confirmation and admission. */
export function DeckPicker(props: Props) {
  const session = useSession();
  if (session.isPending)
    return (
      <p role="status" className="p-3 text-xs text-muted-foreground">
        Loading account…
      </p>
    );
  if (session.error)
    return (
      <div role="alert" className="p-3 text-xs">
        Could not load your account.{' '}
        <Button type="button" variant="outline" size="sm" onClick={() => void session.refetch()}>
          Try again
        </Button>
      </div>
    );
  return (
    <PickerContent
      key={session.data?.session.id ?? 'anonymous'}
      {...props}
      userId={session.data?.user.id}
    />
  );
}
