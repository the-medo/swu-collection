import React from 'react';
import CardPreview from './CardPreview.tsx';

export interface CPDeckFiltersProps {
  // in future: filters props
  className?: string;
}

const CPDeckFilters: React.FC<CPDeckFiltersProps> = ({ className }) => {
  return (
    <div className={`h-full rounded-lg border border-border bg-card p-3 text-xs opacity-80 ${className ?? ''}`}>
      <CardPreview />
      <h3 className="text-sm font-semibold mb-2">Filters</h3>
      <div>Filters mockup (coming soon)</div>
    </div>
  );
};

export default CPDeckFilters;
