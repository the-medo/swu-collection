import React from 'react';
import { useCPDeckContent } from '@/components/app/limited/CardPoolDeckDetail/CPContent/useCPDeckContent.ts';
import CPCardContent from '@/components/app/limited/CardPoolDeckDetail/CPContent/CPCardContent.tsx';
import CPDeckAndTrashCard from '@/components/app/limited/CardPoolDeckDetail/CPContent/CPDeckAndTrashCard.tsx';
import CPSelectionAction from '@/components/app/limited/CardPoolDeckDetail/CPContent/CPSelectionAction.tsx';
import { useCardPoolDeckDetailStore } from '@/components/app/limited/CardPoolDeckDetail/useCardPoolDeckDetailStore.ts';
import { cn } from '@/lib/utils.ts';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import type { UserSettings } from '../../../../../../../shared/lib/userSettings.ts';

export interface CPPoolAndDeckSectionProps {
  deckId?: string;
  poolId?: string;
}

const getHeightStyle = (
  leadersAndBasesExpanded: boolean,
  catPosition: UserSettings['cpLayout_catPosition'] = 'top',
) => {
  let margin = 8 /* top padding */ + 8 /* bottom padding */ + 44; /* top title height */
  if (catPosition === 'top') {
    margin += 8 /* top padding */ + 36; /* type/cost/aspect height */
  }
  if (leadersAndBasesExpanded) {
    margin += 90;
  }
  return { height: `calc(100vh - ${margin}px)` };
};

const CPPoolAndDeckSection: React.FC<CPPoolAndDeckSectionProps> = ({ deckId, poolId }) => {
  const data = useCPDeckContent(deckId, poolId);
  const { leadersAndBasesExpanded } = useCardPoolDeckDetailStore();
  const { data: catPosition } = useGetUserSetting('cpLayout_catPosition');

  const heightStyle = getHeightStyle(leadersAndBasesExpanded, catPosition);

  return (
    <div className="gap-2 grid grid-cols-[minmax(300px,1fr)_300px]">
      <div className={cn('flex flex-1 flex-col gap-2 overflow-x-scroll')} style={heightStyle}>
        <div className="flex-1 overflow-y-auto ">
          <CPCardContent pool={data?.pool} />
        </div>
        <CPSelectionAction poolId={poolId} deckId={deckId} />
      </div>
      <div className={cn('min-w-[300px] overflow-y-auto')} style={heightStyle}>
        <CPDeckAndTrashCard deck={data?.deck} trash={data?.trash} poolId={poolId} deckId={deckId} />
      </div>
    </div>
  );
};

export default CPPoolAndDeckSection;
