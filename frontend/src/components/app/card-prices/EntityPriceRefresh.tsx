import React from 'react';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { usePostEntityPrice } from '@/api/entities/usePostEntityPrice';

export interface EntityPriceRefreshProps {
  entityId: string;
  entityType: string;
}

// Displays a clickable badge that triggers price recomputation for given entity
export const EntityPriceRefresh: React.FC<EntityPriceRefreshProps> = ({ entityId, entityType }) => {
  const { mutate, status } = usePostEntityPrice(entityId, entityType);
  const isPending = status === 'pending' || (status as any) === 'loading';

  return (
    <Badge
      role="button"
      aria-label="Refresh prices"
      aria-busy={isPending}
      aria-disabled={isPending}
      onClick={() => {
        if (!isPending) mutate();
      }}
      className={`mt-2 select-none inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-900 hover:bg-yellow-300 dark:bg-yellow-800 dark:text-yellow-100 dark:hover:bg-yellow-800 whitespace-nowrap ${
        isPending ? 'opacity-70 cursor-wait pointer-events-none' : 'cursor-pointer'
      }`}
    >
      <RefreshCw className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
      <span>{isPending ? 'Refreshing…' : 'Refresh prices'}</span>
    </Badge>
  );
};

export default EntityPriceRefresh;
