import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateCardPriceSource } from '@/api/card-prices/useCreateCardPriceSource';
import { useDeleteCardPriceSource } from '@/api/card-prices/useDeleteCardPriceSource';
import { useFetchCardPrice } from '@/api/card-prices/useFetchCardPrice';

/**
 * Card variant price data structure
 */
export interface CardVariantPrice {
  cardId: string;
  variantId: string;
  sourceType: string;
  sourceLink: string;
  sourceProductId: string | null;
  updatedAt: string | null;
  data: string | null;
  price: number | null;
}

interface ExistingPricingSourceRowProps {
  priceSource: CardVariantPrice;
  onUpdate?: () => void;
  onDelete?: () => void;
}

export const ExistingPricingSourceRow: React.FC<ExistingPricingSourceRowProps> = ({
  priceSource,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [sourceLink, setSourceLink] = useState<string>(priceSource.sourceLink);
  const [sourceProductId, setSourceProductId] = useState<string | null>(priceSource.sourceProductId);

  const updateMutation = useCreateCardPriceSource();
  const deleteMutation = useDeleteCardPriceSource();
  const fetchPriceMutation = useFetchCardPrice();

  const handleUpdate = async () => {
    try {
      await updateMutation.mutateAsync({
        cardId: priceSource.cardId,
        variantId: priceSource.variantId,
        sourceType: priceSource.sourceType,
        sourceLink,
        sourceProductId: sourceProductId || undefined,
      });

      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to update pricing source:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this pricing source?')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        cardId: priceSource.cardId,
        variantId: priceSource.variantId,
        sourceType: priceSource.sourceType,
      });

      onDelete?.();
    } catch (error) {
      console.error('Failed to delete pricing source:', error);
    }
  };

  const handleCancel = () => {
    setSourceLink(priceSource.sourceLink);
    setIsEditing(false);
  };

  const handleFetchPrices = async () => {
    try {
      await fetchPriceMutation.mutateAsync({
        cardId: priceSource.cardId,
        variantId: priceSource.variantId,
        sourceType: priceSource.sourceType,
      });

      onUpdate?.();
    } catch (error) {
      console.error('Failed to fetch price:', error);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-background">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-medium">{priceSource.sourceType}</h4>
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleFetchPrices}
                disabled={fetchPriceMutation.isPending}
              >
                {fetchPriceMutation.isPending ? 'Fetching prices...' : 'Fetch Prices'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Updating...' : 'Update'}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`sourceLink-${priceSource.sourceType}`}>Source Link</Label>
            <Input
              id={`sourceLink-${priceSource.sourceType}`}
              value={sourceLink}
              onChange={e => setSourceLink(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label htmlFor={`sourceProductId-${priceSource.sourceType}`}>Source Product ID</Label>
            <Input
              id={`sourceProductId-${priceSource.sourceType}`}
              value={sourceProductId || ''}
              onChange={e => setSourceProductId(e.target.value || null)}
              placeholder="Product ID"
              className="w-[150px]"
            />
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          <p>
            Source:{' '}
            <a
              href={priceSource.sourceLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              {priceSource.sourceLink}
            </a>
          </p>
          {priceSource.sourceProductId && (
            <p>
              Product ID: <span className="font-mono">{priceSource.sourceProductId}</span>
            </p>
          )}
          <p>
            Last updated:{' '}
            {priceSource.updatedAt ? new Date(priceSource.updatedAt).toLocaleDateString() : 'Never'}
          </p>
        </div>
      )}
    </div>
  );
};
