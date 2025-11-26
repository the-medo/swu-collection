import React from 'react';
import CardPreview from './CardPreview.tsx';
import CPLeftFilters from './CPLeftFilters';
import { cn } from '@/lib/utils.ts';
import { useCardPoolDeckDetailStore } from '@/components/app/limited/CardPoolDeckDetail/useCardPoolDeckDetailStore.ts';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';

export interface CPLeftFiltersAndPreviewProps {
  // in future: filters props
  className?: string;
}

const CPLeftFiltersAndPreview: React.FC<CPLeftFiltersAndPreviewProps> = ({ className }) => {
  const { data: cardPreview } = useGetUserSetting('cpLayout_cardPreview');
  const { leadersAndBasesExpanded } = useCardPoolDeckDetailStore();

  return (
    <div
      className={cn(
        ' min-w-[300px] gap-2 overflow-y-auto',
        {
          'h-[calc(100vh-170px)]': leadersAndBasesExpanded,
          'h-[calc(100vh-120px)]': !leadersAndBasesExpanded,
        },
        className,
      )}
    >
      {cardPreview === 'static' && <CardPreview />}
      <div className={`rounded-lg border border-border bg-card p-3 text-xs ${className ?? ''}`}>
        <CPLeftFilters />
      </div>
    </div>
  );
};

export default CPLeftFiltersAndPreview;
