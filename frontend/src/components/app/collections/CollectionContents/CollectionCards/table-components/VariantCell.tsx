import React from 'react';
import { useCCVariant } from '@/components/app/collections/CollectionContents/CollectionGroups/useCollectionGroupStore.ts';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { variantRenderer } from '@/lib/table/variantRenderer.tsx';

interface VariantCellProps {
  cardKey: string;
}

const VariantCell: React.FC<VariantCellProps> = ({ cardKey }) => {
  const variant = useCCVariant(cardKey);

  if (!variant) return <Skeleton className="w-16 h-4 rounded-md" />;

  return variantRenderer(variant?.variantName ?? '');
};

export default VariantCell;