import { limitedStyles } from '@/components/app/limited/limitedStyles';
import React from 'react';
import CardPreview from './CardPreview.tsx';
import CPLeftFilters from './CPLeftFilters';
import { cn } from '@/lib/utils.ts';
import { useCardPoolDeckDetailStore } from '@/components/app/limited/CardPoolDeckDetail/useCardPoolDeckDetailStore.ts';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import CPLeaderAndBaseCollapsed from '@/components/app/limited/CardPoolDeckDetail/CPLeaderAndBase/CPLeaderAndBaseCollapsed.tsx';
import CPKeyboardShortcuts from '@/components/app/limited/CardPoolDeckDetail/CPLeftFiltersAndPreview/CPKeyboardShortcuts.tsx';

export interface CPLeftFiltersAndPreviewProps {
  deckId?: string;
  mobileExpanded: boolean;
}

const CPLeftFiltersAndPreview: React.FC<CPLeftFiltersAndPreviewProps> = ({
  deckId,
  mobileExpanded,
}) => {
  const { data: cardPreview } = useGetUserSetting('cpLayout_cardPreview');
  const { leadersAndBasesExpanded, filtersExpanded } = useCardPoolDeckDetailStore();

  return (
    <aside
      id="pool-builder-filters"
      aria-label="Filters and layout"
      className={cn(
        limitedStyles.builderFilters,
        mobileExpanded ? 'block' : 'hidden',
        filtersExpanded ? 'lg:block' : 'lg:hidden',
      )}
    >
      <div className="space-y-2">
        {!leadersAndBasesExpanded && (
          <div className={cn('p-2 text-xs', limitedStyles.panel)}>
            <CPLeaderAndBaseCollapsed deckId={deckId} />
          </div>
        )}
        {cardPreview === 'static' && <CardPreview />}
        {/* Keyboard shortcuts toggle section */}
        <div className={cn('p-2 text-xs', limitedStyles.panel)}>
          <CPKeyboardShortcuts />
        </div>
        <div className={cn('p-2 text-xs', limitedStyles.panel)}>
          <CPLeftFilters deckId={deckId} />
        </div>
      </div>
    </aside>
  );
};

export default CPLeftFiltersAndPreview;
