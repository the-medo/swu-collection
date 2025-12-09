import { Button } from '@/components/ui/button.tsx';
import {
  useCardPoolDeckDetailStore,
  useCardPoolDeckDetailStoreActions,
} from '@/components/app/limited/CardPoolDeckDetail/useCardPoolDeckDetailStore.ts';
import { FilterX, FunnelPlus } from 'lucide-react';
import React from 'react';

interface CPExpandButtonProps {}

export const CPExpandButton: React.FC<CPExpandButtonProps> = ({}: CPExpandButtonProps) => {
  const { filtersExpanded } = useCardPoolDeckDetailStore();
  const { setFiltersExpanded } = useCardPoolDeckDetailStoreActions();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setFiltersExpanded(!filtersExpanded)}
      title={filtersExpanded ? 'Collapse filters' : 'Expand filters'}
    >
      {filtersExpanded ? <FilterX className="h-4 w-4" /> : <FunnelPlus className="h-4 w-4 md" />}
    </Button>
  );
};
