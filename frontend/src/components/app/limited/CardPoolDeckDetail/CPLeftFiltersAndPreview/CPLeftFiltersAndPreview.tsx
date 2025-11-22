import React from 'react';
import CardPreview from './CardPreview.tsx';
import CPLeftFilters from './CPLeftFilters';

export interface CPLeftFiltersAndPreviewProps {
  // in future: filters props
  className?: string;
}

const CPLeftFiltersAndPreview: React.FC<CPLeftFiltersAndPreviewProps> = ({ className }) => {
  return (
    <div
      className={`h-full rounded-lg border border-border bg-card p-3 text-xs opacity-80 ${className ?? ''}`}
    >
      <CardPreview />
      <CPLeftFilters className="mt-3" />
    </div>
  );
};

export default CPLeftFiltersAndPreview;
