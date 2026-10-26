import * as React from 'react';
import {
  useComparerStore,
  encodeStateToUrl,
  decodeStateFromUrl,
} from '@/components/app/comparer/useComparerStore';
import { Scale, SquareArrowOutUpRight, X, Crown, Info, Loader2 } from 'lucide-react';
import { useGetCollectionCards } from '@/api/collections/useGetCollectionCards';
import { useGetBulkDecks } from '@/api/decks/useGetBulkDecks';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { useComparerStoreActions } from '@/components/app/comparer/useComparerStore';
import { CollectionCard } from '../../../../../../types/CollectionCard';
import { useEffect, useMemo, useState } from 'react';
import ComparerInstructions from '@/components/app/comparer/ComparerPage/ComparerInstructions.tsx';
import ItemTypeBadge from './ItemTypeBadge';
import ComparerResult from './ComparerResult';
import DeckComparerResult from './DeckComparer/DeckComparerResult.tsx';
import DeckComparerSettings from './DeckComparer/DeckComparerSettings.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import ComparerEntryLoader from './ComparerEntryLoader/ComparerEntryLoader.tsx';
import { workspaceStyles } from '@/components/app/global/WorkspacePage/workspaceStyles.ts';
import { cn } from '@/lib/utils.ts';

const ComparerPage: React.FC = () => {
  const [averageDeck, setAverageDeck] = useState(false);
  const { entries, mainId, mode } = useComparerStore();
  const { setMainId, removeComparerEntry, addComparerEntry, setMode, clearComparerEntries } =
    useComparerStoreActions();
  const navigate = useNavigate({ from: '/comparer' });
  const search = useSearch({ from: '/comparer/' });

  // Update URL when comparer state changes
  useEffect(() => {
    if (entries.length > 0) {
      const encodedState = encodeStateToUrl({ entries, mainId, mode, settings: {} });
      navigate({
        search: prev => ({ ...prev, state: encodedState }),
        replace: true,
      });
    } else {
      // Remove state parameter if comparer is empty
      navigate({
        search: prev => ({ ...prev, state: undefined }),
        replace: true,
      });
    }
  }, [entries, mainId, mode, navigate]);

  // Load state from URL on initial load
  useEffect(() => {
    const stateParam = search.state;
    if (stateParam && typeof stateParam === 'string') {
      const decodedState = decodeStateFromUrl(stateParam);
      if (decodedState && decodedState.entries.length > 0) {
        // Clear current state first to avoid duplicates
        clearComparerEntries();

        // Set mode first
        if (decodedState.mode) {
          setMode(decodedState.mode);
        }

        // Add all entries
        decodedState.entries.forEach(entry => {
          addComparerEntry(entry);
        });

        // Set main ID last
        if (decodedState.mainId) {
          setMainId(decodedState.mainId);
        }
      }
    }
  }, [search.state, setMode, addComparerEntry, setMainId, clearComparerEntries]);

  // Get all entries
  const allEntries = entries;

  // Filter entries by type
  const collectionsEntries = entries.filter(entry => entry.dataType === 'collection');
  const deckEntries = entries.filter(entry => entry.dataType === 'deck');

  // Get the main entry from all entries
  const mainEntry = allEntries.find(entry => entry.id === mainId);

  // Get the main collection entry (for comparison logic)
  const mainCollectionEntry = collectionsEntries.find(entry => entry.id === mainId);

  // Get other entries (to compare against main)
  const otherCollectionEntries = collectionsEntries.filter(entry => entry.id !== mainId);

  // Get other deck entries (to compare against main deck)
  const otherDeckEntries = deckEntries.filter(entry => entry.id !== mainId);

  // Extract all deck IDs for bulk fetching
  const deckIds = deckEntries.map(entry => entry.id);

  // Fetch collection data for main entry (only if it's a collection)
  const { data: mainCollection } = useGetCollectionCards(mainCollectionEntry?.id);

  // Fetch bulk deck data
  const { isLoading: isLoadingDecks } = useGetBulkDecks(deckIds.length > 0 ? deckIds : undefined);

  // Create main cards map for comparison
  const mainCardsMap = useMemo(() => {
    const map = new Map<string, CollectionCard>();

    if (mainCollection?.data) {
      // Generate a unique key for each card
      const getCardKey = (card: CollectionCard) =>
        `${card.cardId}|${card.variantId}|${card.foil}|${card.condition}|${card.language}`;

      // Populate map with main collection cards
      mainCollection.data.forEach(card => {
        map.set(getCardKey(card), card);
      });
    }

    return map;
  }, [mainCollection]);

  const hasMultipleEntryTypes = collectionsEntries.length > 0 && deckEntries.length > 0;

  // Leaving a deck comparison also closes its editor and restores the view selector.
  if (averageDeck && (mainEntry?.dataType !== 'deck' || otherDeckEntries.length === 0)) {
    setAverageDeck(false);
  }

  return (
    <div className={cn(workspaceStyles.theme, 'flex w-full flex-col gap-2 p-2')}>
      <header className="flex items-center justify-between gap-3 pb-1">
        <div className="flex min-w-0 items-center gap-2.5">
          <Scale className="size-5 shrink-0 text-[var(--workspace-accent)]" />
          <h1 className={workspaceStyles.title}>Comparer</h1>
          {allEntries.length > 0 && (
            <span className="rounded-md bg-[var(--workspace-soft)] px-2 py-0.5 text-xs font-medium tabular-nums text-[var(--workspace-accent)]">
              {allEntries.length} items
            </span>
          )}
        </div>
        {allEntries.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm">
                <Info className="size-4" /> How it works
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className={cn(workspaceStyles.theme, 'w-80 max-w-[calc(100vw-2rem)]')}
            >
              <ComparerInstructions />
            </PopoverContent>
          </Popover>
        )}
      </header>

      {allEntries.length === 0 ? (
        <div className={cn(workspaceStyles.panel, 'grid gap-6 p-4 md:grid-cols-2 md:p-5')}>
          <div className="flex flex-col items-start justify-center gap-3">
            <h2 className={workspaceStyles.heading}>Start a comparison</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Compare decklists side by side, or find cards your collections and wantlists have in
              common. Open an item and choose “Add to comparer”.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" asChild>
                <Link to="/decks/public">Browse decks</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/collections/your">Your collections</Link>
              </Button>
            </div>
          </div>
          <ComparerInstructions />
        </div>
      ) : (
        <>
          <Accordion type="single" collapsible defaultValue={mainEntry ? '' : 'items'}>
            <AccordionItem
              value="items"
              className={cn(workspaceStyles.panel, 'overflow-hidden rounded-lg')}
            >
              <AccordionTrigger className="gap-3 bg-[var(--workspace-soft)] px-3 py-2.5 hover:no-underline">
                <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-left text-sm">
                  <span className="font-semibold">Selected items</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {[
                      collectionsEntries.length > 0 && `${collectionsEntries.length} lists`,
                      deckEntries.length > 0 && `${deckEntries.length} decks`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  {mainEntry && (
                    <span className="inline-flex min-w-0 items-center gap-1 text-xs font-normal text-[var(--workspace-accent)]">
                      <Crown className="size-3.5 shrink-0" />
                      <span className="truncate">
                        Main: {mainEntry.additionalData?.title ?? 'Selected item'}
                      </span>
                    </span>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-0">
                <div className="divide-y divide-[var(--workspace-border)]">
                  {allEntries.map(entry => {
                    const title = entry.additionalData?.title ?? 'Untitled item';
                    return (
                      <div
                        key={entry.id}
                        className={cn(
                          'flex flex-wrap items-center justify-between gap-2 px-3 py-2',
                          entry.id === mainId && 'bg-[var(--workspace-soft)]/50',
                        )}
                      >
                        <ComparerEntryLoader entry={entry} />
                        <span className="min-w-0 flex-1 basis-40 break-words text-sm font-medium">
                          {title}
                        </span>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <ItemTypeBadge entry={entry} />
                          {entry.id === mainId ? (
                            <Badge
                              variant="secondary"
                              className="gap-1 bg-[var(--workspace-soft)] text-[var(--workspace-accent)]"
                            >
                              <Crown className="size-3" /> Main
                            </Badge>
                          ) : (
                            <Button
                              size="iconSmall"
                              variant="ghost"
                              aria-label={`Use ${title} as main item`}
                              title="Use as main item"
                              onClick={() => setMainId(entry.id)}
                            >
                              <Crown />
                            </Button>
                          )}
                          <Button size="iconSmall" variant="ghost" asChild>
                            <Link
                              to={
                                entry.dataType === 'deck'
                                  ? '/decks/$deckId'
                                  : '/collections/$collectionId'
                              }
                              params={{ deckId: entry.id, collectionId: entry.id }}
                              aria-label={`Open ${title}`}
                              title="Open item"
                            >
                              <SquareArrowOutUpRight />
                            </Link>
                          </Button>
                          <Button
                            size="iconSmall"
                            variant="ghost"
                            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Remove ${title} from comparer`}
                            title="Remove from comparer"
                            onClick={() => removeComparerEntry(entry.id)}
                          >
                            <X />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {hasMultipleEntryTypes && (
            <Alert variant="warning" size="xs">
              <Info className="size-4" />
              <AlertDescription>
                Decks and collections/wantlists cannot be compared with each other yet. Only items
                of the same type as your main item are compared.
              </AlertDescription>
            </Alert>
          )}
          {!mainEntry ? (
            <Alert>
              <AlertTitle>Choose a main item</AlertTitle>
              <AlertDescription>
                Open Selected items and use the crown button to choose what to compare against.
              </AlertDescription>
            </Alert>
          ) : mainEntry.dataType === 'deck' ? (
            <>
              <DeckComparerSettings averageDeck={averageDeck} />
              {isLoadingDecks ? (
                <div
                  role="status"
                  className={cn(
                    workspaceStyles.panel,
                    'flex items-center gap-2 p-4 text-sm text-muted-foreground',
                  )}
                >
                  <Loader2 className="size-4 animate-spin" />
                  Loading deck data…
                </div>
              ) : otherDeckEntries.length > 0 ? (
                <div className="min-w-0 overflow-x-auto">
                  <DeckComparerResult
                    key={[mainEntry.id, ...otherDeckEntries.map(entry => entry.id).sort()].join(
                      '|',
                    )}
                    averageDeck={averageDeck}
                    onAverageDeckChange={setAverageDeck}
                    mainDeckId={mainEntry.id}
                    otherDeckEntries={otherDeckEntries}
                  />
                </div>
              ) : (
                <div className={cn(workspaceStyles.panel, 'p-4 text-sm text-muted-foreground')}>
                  Add another deck using “Add to comparer” on its page to see the differences.
                </div>
              )}
            </>
          ) : otherCollectionEntries.length > 0 ? (
            <div className="space-y-3">
              {otherCollectionEntries.map(entry => (
                <ComparerResult key={entry.id} mainCardsMap={mainCardsMap} entry={entry} />
              ))}
            </div>
          ) : (
            <div className={cn(workspaceStyles.panel, 'p-4 text-sm text-muted-foreground')}>
              Add another collection or list using “Add to comparer” on its page to find cards in
              common.
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ComparerPage;
