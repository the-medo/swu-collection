import React, { useEffect, useState } from 'react';
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
  catFiltersHeight: number = 0,
) => {
  let margin = 8 /* top padding */ + 8 /* bottom padding */ + 44; /* top title height */
  if (catPosition === 'top') {
    // Add the actual rendered height of the category filters when positioned at the top
    margin += catFiltersHeight;
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

  const [catFiltersHeight, setCatFiltersHeight] = useState(0);

  useEffect(() => {
    if (catPosition !== 'top') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCatFiltersHeight(0);
      return;
    }
    const el = document.getElementById('card-pool-cat-filters');
    if (!el) {
      setCatFiltersHeight(0);
      return;
    }
    const update = () => {
      const rect = el.getBoundingClientRect();
      setCatFiltersHeight(Math.round(rect.height));
    };
    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);

    const onResize = () => update();
    window.addEventListener('resize', onResize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [catPosition]);

  const heightStyle = getHeightStyle(leadersAndBasesExpanded, catPosition, catFiltersHeight);

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
