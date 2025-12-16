import * as React from 'react';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import EntityPriceBadge from '@/components/app/card-prices/EntityPriceBadge.tsx';
import { getPriceSourceSortValue } from '../../../../../../../shared/lib/card-prices/source-type-sorters.ts';
import { useMemo } from 'react';

interface DeckPricingProps {
  deckId: string;
}

const DeckPricing: React.FC<DeckPricingProps> = ({ deckId }) => {
  const { data } = useGetDeck(deckId);

  const prices = useMemo(
    () =>
      (data?.entityPrices ?? []).sort(
        (a, b) => getPriceSourceSortValue(a.sourceType) - getPriceSourceSortValue(b.sourceType),
      ),
    [data?.entityPrices],
  );

  return (
    <div>
      {prices.map(p => (
        <EntityPriceBadge
          entityPrice={p}
          sourceType={p.sourceType}
          entityUpdatedAt={data?.deck.updatedAt}
        />
      ))}
    </div>
  );
};

export default DeckPricing;
