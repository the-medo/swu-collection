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
  const { data: deckInfoPosition } = useGetUserSetting('cpLayout_deckInfoPosition');
  const { leadersAndBasesExpanded } = useCardPoolDeckDetailStore();

  return (
    <div
      className={cn(' min-w-[350px] max-w-[350px] flex flex-col gap-2 overflow-y-auto', {
        'h-[calc(100vh-170px)]': leadersAndBasesExpanded,
        'h-[calc(100vh-120px)]': !leadersAndBasesExpanded,
      })}
    >
      {deckInfoPosition === 'left' && !leadersAndBasesExpanded && (
        <div className={`rounded-lg border border-border bg-card p-3 py-2 text-xs`}>
          <CPLeaderAndBaseCollapsed deckId={deckId} />
        </div>
      )}
      {cardPreview === 'static' && <CardPreview />}
      <div className={`rounded-lg border border-border bg-card p-3 py-2 text-xs`}>
        <CPLeftFilters deckId={deckId} />
      </div>
    </div>
  );
};

export default CPLeftFiltersAndPreview;
