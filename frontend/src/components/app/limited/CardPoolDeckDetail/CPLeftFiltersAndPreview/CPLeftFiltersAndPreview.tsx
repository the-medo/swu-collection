import React from 'react';
import CardPreview from './CardPreview.tsx';
import CPLeftFilters from './CPLeftFilters';
import { cn } from '@/lib/utils.ts';
import { useCardPoolDeckDetailStore } from '@/components/app/limited/CardPoolDeckDetail/useCardPoolDeckDetailStore.ts';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import CPLeaderAndBaseCollapsed from '@/components/app/limited/CardPoolDeckDetail/CPLeaderAndBase/CPLeaderAndBaseCollapsed.tsx';

export interface CPLeftFiltersAndPreviewProps {
  deckId?: string;
}

const CPLeftFiltersAndPreview: React.FC<CPLeftFiltersAndPreviewProps> = ({ deckId }) => {
  const { data: cardPreview } = useGetUserSetting('cpLayout_cardPreview');
  const { leadersAndBasesExpanded, filtersExpanded } = useCardPoolDeckDetailStore();

  return (
    <div
      className={cn('overflow-hidden w-full md:border-r max-md:border-b flex flex-col gap-2', {
        'md:min-w-[50px] md:max-w-[50px] md:-mt-[10px] md:-ml-[1px]': !filtersExpanded,
        'min-w-[350px] max-w-[350px]': filtersExpanded,
        'h-[calc(100vh-155px)]': leadersAndBasesExpanded,
        'h-[calc(100vh-50px)]': !leadersAndBasesExpanded,
      })}
    >
      {!filtersExpanded && (
        <div
          className={cn(
            'flex transition-all duration-300 justify-between items-center p-2 md:-rotate-90 md:origin-bottom-left md:w-[300px] md:translate-x-[43px] md:translate-y-[130px]',
          )}
        >
          <div className="text-2xl font-semibold tracking-tight cursor-pointer flex items-center gap-2">
            Filters & Layout
          </div>
        </div>
      )}

      {filtersExpanded && (
        <div className="flex-1 overflow-y-auto pr-2">
          {!leadersAndBasesExpanded && (
            <div className={`rounded-lg border border-border bg-card p-3 py-2 text-xs mb-2`}>
              <CPLeaderAndBaseCollapsed deckId={deckId} />
            </div>
          )}
          {cardPreview === 'static' && <CardPreview />}
          <div className={`rounded-lg border border-border bg-card p-3 py-2 text-xs`}>
            <CPLeftFilters deckId={deckId} />
          </div>
        </div>
      )}
    </div>
  );
};

export default CPLeftFiltersAndPreview;
