import React, { useMemo } from 'react';
import MissingCardsTable from '@/components/app/decks/DeckContents/DeckCollection/DeckCollectionMissingCards/MissingCardsTable/MissingCardsTable.tsx';
import CollectionCardAction from '@/components/app/collections/CollectionCardActions/CollectionCardAction.tsx';
import { useDeckMissingCardsStore } from '@/components/app/decks/DeckContents/DeckCollection/useDeckMissingCardsStore.ts';
import { useDeckCollection } from '@/components/app/decks/DeckContents/DeckCollection/useDeckCollection.ts';
import { AddMultipleCollectionCardsItem } from '@/api/collections/useAddMultipleCollectionCards.ts';
import { selectDefaultVariant } from '../../../../../../../../server/lib/cards/selectDefaultVariant.ts';
import { CardLanguage } from '../../../../../../../../types/enums.ts';
import { defaultCollectionCardActionConfiguration } from '@/components/app/collections/CollectionCardActions/collectionCardActionLib.ts';
import { useDeckData } from '@/components/app/decks/DeckContents/useDeckData.ts';

interface DeckCollectionMissingCardsProps {
  deckId: string;
}

const DeckCollectionMissingCards: React.FC<DeckCollectionMissingCardsProps> = ({ deckId }) => {
  const { deckMeta } = useDeckData(deckId);
  const finalQuantity = useDeckMissingCardsStore('finalQuantity');
  const { data: deckCollection } = useDeckCollection(deckId);

  const items = useMemo(() => {
    const result: AddMultipleCollectionCardsItem[] = [];
    if (!finalQuantity) return result;
    const usedCards = deckCollection?.usedCards ?? {};
    Object.entries(finalQuantity).forEach(([cardId, entry]) => {
      const qty = entry?.quantity ?? 0;
      if (qty <= 0) return;
      const card = usedCards[cardId];
      // If for some reason card data is missing, skip that entry to avoid bad requests
      if (!card) return;
      const variantId = selectDefaultVariant(card);
      if (!variantId) return;

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

    return result;
  }, [finalQuantity, deckCollection]);

  const replaceStrings = {
    deckName: deckMeta?.name ?? '',
    leaderName: deckMeta?.leader1?.title ?? '',
    baseName: deckMeta?.base?.name ?? '',
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row gap-2 text-xs italic flex-wrap">
        <div className="flex gap-2">
          <div className="flex gap-1">
            <span className="font-bold">CD:</span> <span>collections (for decks)</span>
          </div>
          <div className="flex gap-1">
            <span className="font-bold">CO:</span> <span>other collections</span>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1">
            <span className="font-bold">WL:</span> <span>wantlists</span>
          </div>
          <div className="flex gap-1">
            <span className="font-bold">OL:</span> <span>other lists</span>
          </div>
        </div>
      </div>
      <div className="flex flex-row gap-2 flex-wrap">
        <MissingCardsTable deckId={deckId} />
        <div className="min-w-[350px] max-w-[350px] flex flex-col rounded-md border-border p-2 bg-muted/70 gap-2">
          <CollectionCardAction
            items={items}
            configuration={defaultCollectionCardActionConfiguration}
            templateReplacements={replaceStrings}
          />
        </div>
      </div>
    </div>
  );
};

export default DeckCollectionMissingCards;
