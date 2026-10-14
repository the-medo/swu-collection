import { useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import CardImage from '@/components/app/global/CardImage.tsx';
import { PriceBadge } from '@/components/app/card-prices/PriceBadge.tsx';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll.ts';
import { getCardDetailDialogSearch } from '@/components/app/cards/CardDetail/cardDetailSearchParams.ts';
import type { CardPrinting } from '../../../../../../shared/lib/cardGroupPrintings.ts';
import { CardPriceSourceType } from '../../../../../../types/CardPrices.ts';
import { getGalleryVariantLabel, type SetGalleryVariant } from './cardHomeLib.ts';
import CardGalleryQuantity from './CardGalleryQuantity.tsx';
import type { CardGalleryListEditor } from './useCardGalleryList.ts';

export default function VariantGallery({
  printings,
  treatment,
  listEditor,
  emptyMessage = 'No card versions are available here yet.',
}: {
  printings: CardPrinting[];
  treatment?: SetGalleryVariant;
  listEditor?: CardGalleryListEditor;
  emptyMessage?: string;
}) {
  const navigate = useNavigate();
  const labels = useGetUserSetting('cardGalleryShowLabels');
  const prices = useGetUserSetting('cardGalleryShowPrices');
  const { itemsToShow, hasMore, isLoading, observerTarget } = useInfiniteScroll({
    totalItems: printings.length,
    initialItemsToLoad: 60,
    itemsPerBatch: 30,
    threshold: 300,
  });
  return (
    <div className="space-y-5">
      {!printings.length ? (
        <p className="rounded-xl border p-8 text-center text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="grid grid-cols-2 items-start gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {printings.slice(0, itemsToShow).map(({ card, variant }) => (
            <article key={variant.variantId} className="group min-w-0 rounded-xl text-left">
              <div className="rounded-xl bg-muted/30 p-1 transition-colors group-hover:bg-primary/10">
                <CardImage
                  card={card}
                  cardVariantId={variant.variantId}
                  size="responsive"
                  forceHorizontal={card.type === 'Leader' || card.type === 'Base'}
                  backSideButton={listEditor ? 'top-left' : 'mid'}
                >
                  <button
                    type="button"
                    aria-label={`View ${card.name} — ${variant.set.toUpperCase()} ${variant.cardNo} — ${getGalleryVariantLabel(variant, treatment)}`}
                    className="absolute inset-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                    onClick={() =>
                      void navigate({
                        to: '.',
                        search: previous =>
                          getCardDetailDialogSearch(previous, card.cardId, variant.variantId),
                      })
                    }
                  />
                  {listEditor && (
                    <CardGalleryQuantity
                      key={listEditor.collectionId}
                      card={card}
                      variant={variant}
                      treatment={treatment}
                      editor={listEditor}
                    />
                  )}
                </CardImage>
              </div>
              {prices.data && (
                <div
                  role="group"
                  aria-label={`Prices for ${card.name} — ${variant.set.toUpperCase()} ${variant.cardNo} — ${getGalleryVariantLabel(variant, treatment)}`}
                  className="mt-2 flex flex-wrap justify-center gap-1"
                >
                  <PriceBadge
                    cardId={card.cardId}
                    variantId={variant.variantId}
                    sourceType={CardPriceSourceType.CARDMARKET}
                  />
                  <PriceBadge
                    cardId={card.cardId}
                    variantId={variant.variantId}
                    sourceType={CardPriceSourceType.TCGPLAYER}
                  />
                </div>
              )}
              {labels.data && (
                <>
                  <p className="mt-3 break-words text-sm font-semibold">{card.name}</p>
                  <p className="mb-2 mt-1 text-xs text-muted-foreground">
                    {variant.set.toUpperCase()} · {variant.cardNo} ·{' '}
                    {getGalleryVariantLabel(variant, treatment)}
                  </p>
                </>
              )}
            </article>
          ))}
        </div>
      )}
      <div
        ref={observerTarget}
        data-testid="card-gallery-sentinel"
        className="flex min-h-1 justify-center"
      >
        {hasMore && isLoading && (
          <p role="status" className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading more cards…
          </p>
        )}
      </div>
    </div>
  );
}
