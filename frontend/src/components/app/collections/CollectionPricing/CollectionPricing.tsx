import * as React from 'react';
import EntityPriceBadge from '@/components/app/card-prices/EntityPriceBadge.tsx';
import { useMemo } from 'react';
import { useGetCollection } from '@/api/collections/useGetCollection.ts';
import { getPriceSourceSortValue } from '../../../../../../shared/lib/card-prices/source-type-sorters.ts';
import EntityPriceRefresh from '@/components/app/card-prices/EntityPriceRefresh.tsx';

interface CollectionPricingProps {
  collectionId: string;
  showReloadButtonWhenNoPrices?: boolean;
}

const CollectionPricing: React.FC<CollectionPricingProps> = ({
  collectionId,
  showReloadButtonWhenNoPrices = false,
}) => {
  const { data } = useGetCollection(collectionId);

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
            <EntityPriceRefresh entityId={collectionId} entityType="collection" />
          </div>
        ) : null
      ) : (
        prices.map(p => (
          <EntityPriceBadge
            key={`${p.sourceType}`}
            entityPrice={p}
            sourceType={p.sourceType}
            entityUpdatedAt={data?.collection.updatedAt}
          />
        ))
      )}
    </div>
  );
};

export default CollectionPricing;
