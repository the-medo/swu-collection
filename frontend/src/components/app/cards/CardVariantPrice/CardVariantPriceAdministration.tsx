import * as React from 'react';
import { NewPricingSourceRow } from './NewPricingSourceRow';
import { ExistingPricingSourceRow } from './ExistingPricingSourceRow';
import { useGetAllCardPriceSources } from '@/api/card-prices/useGetAllCardPriceSources';
import { useRole } from '@/hooks/useRole.ts';

interface CardVariantPriceAdministrationProps {
  cardId: string;
  variantId: string;
}

export const CardVariantPriceAdministration: React.FC<CardVariantPriceAdministrationProps> = ({
  cardId,
  variantId,
}) => {
  const hasRole = useRole();
  const isAdmin = hasRole('admin');

  const { data: priceSources, refetch } = useGetAllCardPriceSources({
    cardId,
    variantId,
  });

  if (!isAdmin) {
    return null;
  }

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-4">Price Administration</h3>

        <div className="space-y-3">
          {/* Always show the new pricing source row */}
          <NewPricingSourceRow cardId={cardId} variantId={variantId} onSuccess={handleRefresh} />

          {/* Render existing pricing source rows */}
          {priceSources?.data && priceSources.data.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Existing Pricing Sources</h4>
              {priceSources.data.map(priceSource => (
                <ExistingPricingSourceRow
                  key={`${priceSource.cardId}-${priceSource.variantId}-${priceSource.sourceType}`}
                  priceSource={priceSource}
                  onUpdate={handleRefresh}
                  onDelete={handleRefresh}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
