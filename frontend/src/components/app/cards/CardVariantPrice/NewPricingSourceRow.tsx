import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateCardPriceSource } from '@/api/card-prices/useCreateCardPriceSource';

interface NewPricingSourceRowProps {
  cardId: string;
  variantId: string;
  onSuccess?: () => void;
}

export const NewPricingSourceRow: React.FC<NewPricingSourceRowProps> = ({
  cardId,
  variantId,
  onSuccess,
}) => {
  const [sourceType, setSourceType] = useState('cardmarket');
  const [sourceLink, setSourceLink] = useState('');
  const [sourceProductId, setSourceProductId] = useState<string>('');

  const createMutation = useCreateCardPriceSource();

  const handleCreate = async () => {
    if (!sourceLink) {
      return;
    }

    try {
      await createMutation.mutateAsync({
        cardId,
        variantId,
        sourceType,
        sourceLink,
        sourceProductId: sourceProductId || undefined,
      });

      // Reset form after successful creation
      setSourceLink('');
      setSourceProductId('');

      // Call onSuccess callback to refresh data
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create pricing source:', error);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-muted/30">
      <h4 className="font-medium mb-3">Add New Pricing Source</h4>

      <div className="flex flex-wrap gap-3">
        <div className="shrink-0">
          <Label htmlFor="sourceType">Source Type</Label>
          <Input
            id="sourceType"
            value={sourceType}
            onChange={e => setSourceType(e.target.value)}
            placeholder="cardmarket"
            className="w-[150px]"
          />
        </div>

        <div className="grow min-w-[200px]">
          <Label htmlFor="sourceLink">Source Link</Label>
          <Input
            id="sourceLink"
            value={sourceLink}
            onChange={e => setSourceLink(e.target.value)}
            placeholder="https://..."
            className="w-full"
          />
        </div>

        <div className="shrink-0">
          <Label htmlFor="sourceProductId">Source Product ID</Label>
          <Input
            id="sourceProductId"
            value={sourceProductId}
            onChange={e => setSourceProductId(e.target.value)}
            placeholder="Product ID"
            className="w-[150px]"
          />
        </div>

        <div className="flex items-end shrink-0">
          <Button
            onClick={handleCreate}
            disabled={!sourceLink || createMutation.isPending}
            className="w-[150px]"
          >
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
};
