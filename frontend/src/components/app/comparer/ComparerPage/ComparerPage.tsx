import * as React from 'react';
import { useComparerStore } from '@/components/app/comparer/useComparerStore';
import { Scale, BookOpenCheck, ScrollText, NotebookTabs } from 'lucide-react';
import { useGetCollectionCards } from '@/api/collections/useGetCollectionCards';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link } from '@tanstack/react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useComparerStoreActions } from '@/components/app/comparer/useComparerStore';
import { CollectionType } from '../../../../../../types/enums';
import { CollectionCard } from '../../../../../../types/CollectionCard';
import CollectionLayoutTableSmall from '@/components/app/collections/CollectionContents/CollectionCards/CollectionLayoutTableSmall/CollectionLayoutTableSmall.tsx';
import { useMemo } from 'react';
import ComparerInstructions from '@/components/app/comparer/ComparerPage/ComparerInstructions.tsx';

// Render collection type badge
const renderCollectionTypeBadge = (type?: CollectionType) => {
  switch (type) {
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
        {renderCollectionTypeBadge(entry.collectionType)}
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
  const { entries, mainId } = useComparerStore();
  const { setMainId, removeComparerEntry } = useComparerStoreActions();

  // Filter to only collections
  const collectionsEntries = entries.filter(entry => entry.dataType === 'collection');

  // Get the main entry
  const mainEntry = collectionsEntries.find(entry => entry.id === mainId);

  // Get other entries (to compare against main)
  const otherEntries = collectionsEntries.filter(entry => entry.id !== mainId);

  // Fetch collection data for main entry
  const { data: mainCollection } = useGetCollectionCards(mainEntry?.id);

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

  if (collectionsEntries.length === 0) {
    return (
      <div className="flex max-lg:flex-col gap-2 p-2">
        <Alert className="">
          <Scale className="h-4 w-4" />
          <AlertTitle>No collections in comparer</AlertTitle>
          <AlertDescription>
            Add collections to the comparer from collection pages to start comparing them.
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
          <AlertTitle>No main collection selected</AlertTitle>
          <AlertDescription>Please select a main collection to compare against.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Collections in Comparer</h3>
        <div className="flex flex-wrap gap-2">
          <div className="flex flex-grow flex-col gap-2">
            {collectionsEntries.map(entry => (
              <div
                key={entry.id}
                className={`flex gap-2 items-center justify-between border rounded-md p-2 ${entry.id === mainId ? 'border-primary bg-primary/10' : 'border-muted'}`}
              >
                <div className="flex gap-2 items-center">
                  {renderCollectionTypeBadge(entry.collectionType)}
                  <span className="font-medium">
                    {entry.additionalData?.title ?? '- Unknown -'}
                  </span>
                </div>
                <div className="ml-4 flex gap-2">
                  {entry.id === mainId && <Badge variant="default">Main</Badge>}
                  {entry.id !== mainId && (
                    <Button size="sm" variant="outline" onClick={() => setMainId(entry.id)}>
                      Make Main
                    </Button>
                  )}

                  <Button size="sm" variant="outline" asChild>
                    <Link to={'/collections/' + entry.id}>Open</Link>
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeComparerEntry(entry.id)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <ComparerInstructions />
        </div>
      </div>

      {otherEntries.length > 0 ? (
        <div className="space-y-4">
          {otherEntries.map(entry => (
            <ComparerResult key={entry.id} mainCardsMap={mainCardsMap} entry={entry} />
          ))}
        </div>
      ) : (
        <Alert>
          <AlertTitle>No comparisons available</AlertTitle>
          <AlertDescription>
            Add more collections to the comparer to see comparisons.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
};

export default ComparerPage;
