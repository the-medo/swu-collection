import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { ArrowLeft, MinusCircle, PlusCircle, CheckCircle2, Link as LinkIcon } from 'lucide-react';
import { useDeckMissingCardsStore } from '@/components/app/decks/DeckContents/DeckCollection/useDeckMissingCardsStore.ts';
import { useDeckCollection } from '@/components/app/decks/DeckContents/DeckCollection/useDeckCollection.ts';
import { selectDefaultVariant } from '../../../../../../../../server/lib/cards/selectDefaultVariant.ts';
import { CardLanguage, CollectionType } from '../../../../../../../../types/enums.ts';
import {
  AddMultipleCollectionCardsItem,
  useAddMultipleCollectionCards,
} from '@/api/collections/useAddMultipleCollectionCards.ts';
import { collectionTypeTitle } from '../../../../../../../../types/iterableEnumInfo.ts';
import { Link } from '@tanstack/react-router';

interface MissingCardsActionStep3Props {
  deckId: string;
  collectionId: string;
  collectionTitle?: string;
  collectionType: CollectionType;
  onBack: () => void;
}

const MissingCardsActionStep3: React.FC<MissingCardsActionStep3Props> = ({
  deckId,
  collectionId,
  collectionTitle,
  collectionType,
  onBack,
}) => {
  const finalQuantity = useDeckMissingCardsStore('finalQuantity');
  const { data: deckCollection } = useDeckCollection(deckId);
  const addMultipleMutation = useAddMultipleCollectionCards();

  const { totalCount, items } = useMemo(() => {
    let total = 0;
    const result: AddMultipleCollectionCardsItem[] = [];

    if (!finalQuantity) return { totalCount: 0, items: result };

    const usedCards = deckCollection?.usedCards ?? {};

    Object.entries(finalQuantity).forEach(([cardId, entry]) => {
      const qty = entry?.quantity ?? 0;
      if (qty <= 0) return;
      const card = usedCards[cardId];
      // If for some reason card data is missing, skip that entry to avoid bad requests
      if (!card) return;
      const variantId = selectDefaultVariant(card);
      if (!variantId) return;

      total += qty;
      result.push({
        cardId,
        variantId,
        foil: false,
        condition: 1,
        language: CardLanguage.EN,
        note: '',
        amount: qty,
      });
    });

    return { totalCount: total, items: result };
  }, [finalQuantity, deckCollection]);

  const [completedAction, setCompletedAction] = useState<'insert' | 'remove' | undefined>(
    undefined,
  );

  const act = (remove: boolean) => {
    if (items.length === 0) return;
    setCompletedAction(undefined);
    addMultipleMutation.mutate(
      { collectionId, items, remove },
      {
        onSuccess: () => setCompletedAction(remove ? 'remove' : 'insert'),
      },
    );
  };

  const collectionUrl = `/collections/${collectionId}`;
  const isDone = addMultipleMutation.isSuccess && !!completedAction;

  if (collectionType === undefined) return null;
  const cardListString = collectionTypeTitle[collectionType];

  return (
    <div className="min-w-[300px] flex flex-col rounded-md border-border p-2 bg-muted/70 gap-2">
      <h4>Finalize</h4>
      {collectionTitle && <h5>{collectionTitle}</h5>}
      <div className="text-sm">Total cards to apply: {totalCount}</div>

      {isDone ? (
        <>
          <div className="flex flex-col gap-2 bg-background p-2 rounded-md bg-green-100 dark:bg-green-900">
            <div className="mb-0 flex flex-1 flex-row gap-2 items-center justify-center text-green-600 dark:text-green-500">
              <CheckCircle2 />
              {completedAction === 'insert' ? 'Cards inserted' : 'Cards removed'} successfully!
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button
              size="icon"
              aria-label={`Go to back`}
              onClick={onBack}
              disabled={addMultipleMutation.isPending}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Link className="underline text-sm" to={collectionUrl} target="_blank" rel="noreferrer">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  navigator.clipboard.writeText(`${window.location.origin}${collectionUrl}`)
                }
              >
                Open {cardListString}
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                navigator.clipboard.writeText(`${window.location.origin}${collectionUrl}`)
              }
            >
              <LinkIcon className="h-4 w-4 mr-1" /> Copy link
            </Button>
          </div>
        </>
      ) : (
        <div className="flex justify-between items-center mt-2">
          <Button
            size="icon"
            aria-label={`Go to back`}
            onClick={onBack}
            disabled={addMultipleMutation.isPending}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={items.length === 0 || addMultipleMutation.isPending}
              onClick={() => act(true)}
              title="Remove cards (subtract amounts)"
            >
              <MinusCircle className="h-4 w-4 mr-1" /> Remove
            </Button>
            <Button
              disabled={items.length === 0 || addMultipleMutation.isPending}
              onClick={() => act(false)}
              title="Insert cards (add amounts)"
            >
              <PlusCircle className="h-4 w-4 mr-1" /> Insert
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MissingCardsActionStep3;
