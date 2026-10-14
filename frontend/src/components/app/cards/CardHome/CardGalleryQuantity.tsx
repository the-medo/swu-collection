import DeckCardQuantitySelector from '@/components/app/decks/DeckContents/DeckCards/DeckCardQuantitySelector.tsx';
import { getFoilBasedOnVariantAndSet } from '@/components/app/collections/CollectionInput/collectionInputLib.ts';
import { getCollectionCardIdentificationKey } from '@/api/collections/usePutCollectionCard.ts';
import { CardCondition, CardLanguage } from '../../../../../../types/enums.ts';
import { cardConditionObj } from '../../../../../../types/iterableEnumInfo.ts';
import type { CardPrinting } from '../../../../../../shared/lib/cardGroupPrintings.ts';
import type { CardGalleryListEditor } from './useCardGalleryList.ts';
import CardGalleryCustomQuantity from './CardGalleryCustomQuantity.tsx';
import type { SetGalleryVariant } from './cardHomeLib.ts';

export default function CardGalleryQuantity({
  card,
  variant,
  editor,
  treatment,
}: CardPrinting & { editor: CardGalleryListEditor; treatment?: SetGalleryVariant }) {
  const id = {
    cardId: card.cardId,
    variantId: variant.variantId,
    language: CardLanguage.EN,
    condition: cardConditionObj[CardCondition.NM].numericValue,
    foil:
      treatment === 'standard-foil' ||
      treatment === 'hyperspace-foil' ||
      treatment === 'foil-prestige' ||
      treatment === 'weekly-play-foil' ||
      getFoilBasedOnVariantAndSet(variant, false, card.variants),
  };
  const amount = editor.cards.get(getCollectionCardIdentificationKey(id))?.amount ?? 0;
  const label = `Quantity of ${card.name} — ${variant.set.toUpperCase()} ${variant.cardNo} — ${variant.variantName} — ${id.foil ? 'Foil' : 'Non-foil'}`;
  return (
    <div
      className="absolute bottom-1 left-1/2 z-10 flex w-max -translate-x-1/2 items-center rounded-md bg-background/90 p-0.5 shadow-sm backdrop-blur-sm"
      role="group"
      aria-label={label}
      aria-busy={editor.disabled || editor.busy}
    >
      <DeckCardQuantitySelector
        label={label}
        value={amount}
        variant="gallery"
        activationMode="manual"
        disabled={editor.disabled}
        busy={editor.busy}
        onChange={quantity => void editor.changeAmount(id, quantity)}
      />
      <CardGalleryCustomQuantity
        amount={amount}
        disabled={editor.disabled}
        busy={editor.busy}
        onSave={quantity => editor.changeAmount(id, quantity)}
      />
    </div>
  );
}
