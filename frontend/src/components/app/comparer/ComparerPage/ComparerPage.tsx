import * as React from 'react';
import {
  useComparerStore,
  encodeStateToUrl,
  decodeStateFromUrl,
} from '@/components/app/comparer/useComparerStore';
import { Scale, SquareArrowOutUpRight, X, Crown, Info } from 'lucide-react';
import { useGetCollectionCards } from '@/api/collections/useGetCollectionCards';
import { useGetBulkDecks } from '@/api/decks/useGetBulkDecks';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { useComparerStoreActions } from '@/components/app/comparer/useComparerStore';
import { CollectionCard } from '../../../../../../types/CollectionCard';
import { useEffect, useMemo } from 'react';
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

const ComparerPage: React.FC = () => {
  const { entries, mainId, mode } = useComparerStore();
  const { setMainId, removeComparerEntry, addComparerEntry, setMode, clearComparerEntries } =
    useComparerStoreActions();
  const navigate = useNavigate();
  const search = useSearch({ strict: false });

  // Update URL when comparer state changes
  useEffect(() => {
    if (entries.length > 0) {
      const encodedState = encodeStateToUrl({ entries, mainId, mode, settings: {} });
      navigate({
        // @ts-ignore
        search: prev => ({ ...prev, state: encodedState }),
        replace: true,
      });
    } else {
      // Remove state parameter if comparer is empty
      navigate({
        // @ts-ignore
        search: prev => {
          const { state, ...rest } = prev;
          return rest;
        },
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

  if (allEntries.length === 0) {
    return (
      <div className="flex max-lg:flex-col gap-2 p-2">
        <Alert className="">
          <Scale className="h-4 w-4" />
          <AlertTitle>No items in comparer</AlertTitle>
          <AlertDescription>
            Add collections or decks to the comparer from their pages to start comparing them.
          </AlertDescription>
        </Alert>
        <ComparerInstructions />
      </div>
    );
  }

  if (!mainEntry) {
    return (
      <div className="p-6">
        <Alert className="max-w-3xl mx-auto">
          <Scale className="h-4 w-4" />
          <AlertTitle>No main item selected</AlertTitle>
          <AlertDescription>Please select a main item to compare against.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const hasMultipleEntryTypes = collectionsEntries.length > 0 && deckEntries.length > 0;

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-start gap-4">
        <Accordion type="single" collapsible defaultValue="" className="w-full">
          <AccordionItem value="items" className="border rounded-md">
            <AccordionTrigger className="px-4 pt-2 pb-0 hover:no-underline">
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  Items in Comparer
                  {collectionsEntries.length > 0 && ` ( Collections: ${collectionsEntries.length}`}
                  {deckEntries.length > 0 &&
                    `${collectionsEntries.length > 0 ? ',' : ' ('} Decks: ${deckEntries.length}`}
                  {(collectionsEntries.length > 0 || deckEntries.length > 0) && ' )'}
                </span>
                {hasMultipleEntryTypes && (
                  <span className="text-red-500 text-sm font-medium">
                    Comparing decks with collections/wantlists is not supported yet.
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-grow flex-col gap-2 p-4">
                {allEntries.map(entry => (
                  <div
                    key={entry.id}
                    className={`flex max-lg:flex-col gap-2 items-center justify-between border rounded-md p-2 ${entry.id === mainId ? 'border-primary bg-primary/10' : 'border-muted'}`}
                  >
                    <ComparerEntryLoader entry={entry} />
                    <div className="flex gap-2 items-center">
                      <span className="font-medium">
                        {entry.additionalData?.title ?? '- Unknown -'}
                      </span>
                    </div>
                    <div className="ml-4 flex gap-2">
                      <ItemTypeBadge entry={entry} />
                      {entry.id === mainId && (
                        <Badge variant="default">
                          Main <Crown size={16} className="ml-2" />
                        </Badge>
                      )}
                      {entry.id !== mainId && (
                        <Button
                          size="iconSmall"
                          variant="outline"
                          onClick={() => setMainId(entry.id)}
                        >
                          <Crown />
                        </Button>
                      )}

                      <Button size="iconSmall" variant="outline" asChild>
                        <Link to={'/collections/' + entry.id}>
                          <SquareArrowOutUpRight />
                        </Link>
                      </Button>

                      <Button
                        size="iconSmall"
                        variant="destructive"
                        onClick={() => removeComparerEntry(entry.id)}
                      >
                        <X />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <Popover>
          <PopoverTrigger>
            <Info className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer" />
          </PopoverTrigger>
          <PopoverContent className="w-[400px]">
            <ComparerInstructions />
          </PopoverContent>
        </Popover>
      </div>

      {/* Show settings when we have a deck as main entry */}
      {mainEntry?.dataType === 'deck' && <DeckComparerSettings />}
      {mainEntry?.dataType === 'deck' ? (
        isLoadingDecks ? (
          <div className="p-4 border rounded-md">
            <h3 className="text-lg font-semibold mb-4">Deck Contents</h3>
            <p>Loading deck data...</p>
          </div>
        ) : otherDeckEntries.length > 0 ? (
          <DeckComparerResult mainDeckId={mainEntry.id} otherDeckEntries={otherDeckEntries} />
        ) : (
          <div className="p-4 border rounded-md">
            <h3 className="text-lg font-semibold mb-4">Deck Contents</h3>
            <Alert>
              <AlertTitle>No deck comparisons available</AlertTitle>
              <AlertDescription>
                Add more decks to the comparer to see comparisons.
              </AlertDescription>
            </Alert>
          </div>
        )
      ) : otherCollectionEntries.length > 0 ? (
        <div className="space-y-4">
          {otherCollectionEntries.map(entry => (
            <ComparerResult key={entry.id} mainCardsMap={mainCardsMap} entry={entry} />
          ))}
        </div>
      ) : (
        <Alert>
          <AlertTitle>No comparisons available</AlertTitle>
          <AlertDescription>
            Add more collections or decks to the comparer to see comparisons.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ComparerPage;
