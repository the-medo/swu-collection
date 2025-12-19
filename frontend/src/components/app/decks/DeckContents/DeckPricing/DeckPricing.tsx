import * as React from 'react';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import EntityPriceBadge from '@/components/app/card-prices/EntityPriceBadge.tsx';
import { getPriceSourceSortValue } from '../../../../../../../shared/lib/card-prices/source-type-sorters.ts';
import { useMemo } from 'react';
import EntityPriceRefresh from '@/components/app/card-prices/EntityPriceRefresh.tsx';

interface DeckPricingProps {
  deckId: string;
  showReloadButtonWhenNoPrices?: boolean;
}

const DeckPricing: React.FC<DeckPricingProps> = ({
  deckId,
  showReloadButtonWhenNoPrices = false,
}) => {
  const { data } = useGetDeck(deckId);

  const prices = useMemo(
    () =>
      (data?.entityPrices ?? []).sort(
        (a, b) => getPriceSourceSortValue(a.sourceType) - getPriceSourceSortValue(b.sourceType),
      ),
    [data?.entityPrices],
  );

  if (!prices.length && !showReloadButtonWhenNoPrices) return null;

  return (
    <div>
      {prices.length === 0 ? (
        showReloadButtonWhenNoPrices ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <span>No prices available</span>
            <EntityPriceRefresh entityId={deckId} entityType="deck" />
          </div>
        ) : null
      ) : (
        prices.map(p => (
          <EntityPriceBadge
            key={`${p.sourceType}`}
            entityPrice={p}
            sourceType={p.sourceType}
            entityUpdatedAt={data?.deck.updatedAt}
          />
        ))
      )}
    </div>
  );
};

export default DeckPricing;
