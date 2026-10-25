import { limitedStyles } from '@/components/app/limited/limitedStyles';
import { cn } from '@/lib/utils';
import React from 'react';
import CPCostFilters from './CPCostFilters.tsx';
import CPAspectFilters from './CPAspectFilters.tsx';
import CPTypeFilters from './CPTypeFilters.tsx';

interface CPTopFiltersProps {
  deckId?: string;
}

const CPTopFilters: React.FC<CPTopFiltersProps> = ({ deckId }) => {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-row justify-between flex-wrap gap-2',
        limitedStyles.categoryFilters,
      )}
      id="card-pool-cat-filters"
    >
      <CPTypeFilters />
      <CPCostFilters />
      <CPAspectFilters deckId={deckId} />
    </div>
  );
};

export default CPTopFilters;
