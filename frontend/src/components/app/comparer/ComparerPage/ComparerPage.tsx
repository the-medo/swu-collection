import * as React from 'react';
import {
  useComparerStore,
  encodeStateToUrl,
  decodeStateFromUrl,
} from '@/components/app/comparer/useComparerStore';
import {
  Scale,
  BookOpenCheck,
  ScrollText,
  NotebookTabs,
  SquareArrowOutUpRight,
  X,
  Crown,
} from 'lucide-react';
import { useGetCollectionCards } from '@/api/collections/useGetCollectionCards';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useComparerStoreActions } from '@/components/app/comparer/useComparerStore';
import { CollectionType } from '../../../../../../types/enums';
import { CollectionCard } from '../../../../../../types/CollectionCard';
import CollectionLayoutTableSmall from '@/components/app/collections/CollectionContents/CollectionCards/CollectionLayoutTableSmall/CollectionLayoutTableSmall.tsx';
import { useEffect, useMemo } from 'react';
import ComparerInstructions from '@/components/app/comparer/ComparerPage/ComparerInstructions.tsx';
import { Route } from '@/routes/comparer';

// Render item type badge
const renderItemTypeBadge = (entry: ReturnType<typeof useComparerStore>['entries'][number]) => {
  // If it's a deck, return a deck badge
  if (entry.dataType === 'deck') {
    return (
      <Badge className="bg-green-200">
        <NotebookTabs className="mr-1 h-3 w-3" />
        Deck
      </Badge>
    );
  }

  // Otherwise, render collection type badge
  switch (entry.collectionType) {
    case CollectionType.COLLECTION:
      return (
        <Badge className="bg-blue-200">
          <BookOpenCheck className="mr-1 h-3 w-3" />
          Collection
        </Badge>
      );
    case CollectionType.WANTLIST:
      return (
        <Badge className="bg-amber-200">
          <ScrollText className="mr-1 h-3 w-3" />
          Wantlist
        </Badge>
      );
    case CollectionType.OTHER:
      return (
        <Badge className="bg-gray-200">
          <NotebookTabs className="mr-1 h-3 w-3" />
          Other
        </Badge>
      );
    default:
      return (
        <Badge className="bg-blue-200">
          <BookOpenCheck className="mr-1 h-3 w-3" />
          Collection
        </Badge>
      );
  }
};

// Extract comparison logic to separate component
const ComparerResult: React.FC<{
  mainCardsMap: Map<string, CollectionCard>;
  entry: ReturnType<typeof useComparerStore>['entries'][number];
}> = ({ mainCardsMap, entry }) => {
  const { data: otherCollection } = useGetCollectionCards(entry.id);

  // Calculate intersection
  const intersectionCards = useMemo(() => {
    const result: CollectionCard[] = [];

    if (otherCollection?.data && mainCardsMap.size > 0) {
      // Generate a unique key for each card
      const getCardKey = (card: CollectionCard) =>
        `${card.cardId}|${card.variantId}|${card.foil}|${card.condition}|${card.language}`;

      // Find intersections
      otherCollection.data.forEach(otherCard => {
        const key = getCardKey(otherCard);
        const mainCard = mainCardsMap.get(key);

        if (mainCard) {
          // Card exists in both collections - take the lesser amount
          const intersectionCard: CollectionCard = {
            ...mainCard,
            amount: Math.min(mainCard.amount, otherCard.amount),
          };

          result.push(intersectionCard);
        }
      });
    }

    return result;
  }, [otherCollection, mainCardsMap]);

  return (
    <div className="p-4">
      <h3 className="flex gap-4 text-lg font-semibold mb-4">
        Comparison with {entry.additionalData?.title ?? '- Unknown -'}
        {renderItemTypeBadge(entry)}
      </h3>

      <div className="mb-2">
        <span className="text-sm font-medium">{intersectionCards.length} cards in common</span>
      </div>

      {intersectionCards.length ? (
        <CollectionLayoutTableSmall collectionId={entry.id} cards={intersectionCards} />
      ) : null}
    </div>
  );
};

const ComparerPage: React.FC = () => {
  const { entries, mainId, mode } = useComparerStore();
  const { setMainId, removeComparerEntry, addComparerEntry, setMode, clearComparerEntries } =
    useComparerStoreActions();
  const navigate = useNavigate();
  const search = useSearch({ from: Route.fullPath });

  // Update URL when comparer state changes
  useEffect(() => {
    if (entries.length > 0) {
      const encodedState = encodeStateToUrl({ entries, mainId, mode });
      navigate(
        {
          search: prev => ({ ...prev, state: encodedState }),
        },
        { replace: true },
      );
    } else {
      // Remove state parameter if comparer is empty
      navigate(
        {
          search: prev => {
            const { state, ...rest } = prev;
            return rest;
          },
        },
        { replace: true },
      );
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

  // Filter to only collections (for comparison logic)
  const collectionsEntries = entries.filter(entry => entry.dataType === 'collection');

  // Get the main entry from all entries
  const mainEntry = allEntries.find(entry => entry.id === mainId);

  // Get the main collection entry (for comparison logic)
  const mainCollectionEntry = collectionsEntries.find(entry => entry.id === mainId);

  // Get other entries (to compare against main)
  const otherEntries = collectionsEntries.filter(entry => entry.id !== mainId);

  // Fetch collection data for main entry (only if it's a collection)
  const { data: mainCollection } = useGetCollectionCards(mainCollectionEntry?.id);

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

  return (
    <>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Items in Comparer</h3>
        <div className="flex flex-wrap gap-2">
          <div className="flex flex-grow flex-col gap-2">
            {allEntries.map(entry => (
              <div
                key={entry.id}
                className={`flex max-lg:flex-col gap-2 items-center justify-between border rounded-md p-2 ${entry.id === mainId ? 'border-primary bg-primary/10' : 'border-muted'}`}
              >
                <div className="flex gap-2 items-center">
                  <span className="font-medium">
                    {entry.additionalData?.title ?? '- Unknown -'}
                  </span>
                </div>
                <div className="ml-4 flex gap-2">
                  {renderItemTypeBadge(entry)}
                  {entry.id === mainId && (
                    <Badge variant="default">
                      Main <Crown size={16} className="ml-2" />
                    </Badge>
                  )}
                  {entry.id !== mainId && (
                    <Button size="iconSmall" variant="outline" onClick={() => setMainId(entry.id)}>
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
          <ComparerInstructions />
        </div>
      </div>

      {mainEntry?.dataType === 'deck' ? (
        <Alert>
          <AlertTitle>Deck comparison not supported</AlertTitle>
          <AlertDescription>
            Currently, only collections can be used as the main item for comparison. Please select a
            collection as the main item.
          </AlertDescription>
        </Alert>
      ) : otherEntries.length > 0 ? (
        <div className="space-y-4">
          {otherEntries.map(entry => (
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
    </>
  );
};

export default ComparerPage;
