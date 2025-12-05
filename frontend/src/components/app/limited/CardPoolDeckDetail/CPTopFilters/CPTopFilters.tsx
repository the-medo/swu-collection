import React from 'react';
import CPCostFilters from './CPCostFilters.tsx';
import CPAspectFilters from './CPAspectFilters.tsx';
import CPTypeFilters from './CPTypeFilters.tsx';

interface CPTopFiltersProps {
  deckId?: string;
}

const CPTopFilters: React.FC<CPTopFiltersProps> = ({ deckId }) => {
  return (
    <div className="flex flex-row justify-between flex-wrap gap-4" id="card-pool-cat-filters">
      <CPTypeFilters />
      <CPCostFilters />
      <CPAspectFilters deckId={deckId} />
    </div>
  );
};

export default CPTopFilters;
