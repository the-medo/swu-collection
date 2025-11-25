import React from 'react';
import { useCPDeckContent } from '@/components/app/limited/CardPoolDeckDetail/CPContent/useCPDeckContent.ts';
import CPCardContent from '@/components/app/limited/CardPoolDeckDetail/CPContent/CPCardContent.tsx';
import CPDeckAndTrashCard from '@/components/app/limited/CardPoolDeckDetail/CPContent/CPDeckAndTrashCard.tsx';
import { useCardPoolDeckDetailStore } from '@/components/app/limited/CardPoolDeckDetail/useCardPoolDeckDetailStore.ts';
import { cn } from '@/lib/utils.ts';

export interface CPPoolAndDeckSectionProps {
  deckId?: string;
  poolId?: string;
}

const CPPoolAndDeckSection: React.FC<CPPoolAndDeckSectionProps> = ({ deckId, poolId }) => {
  const data = useCPDeckContent(deckId, poolId);

  const { leadersAndBasesExpanded } = useCardPoolDeckDetailStore();

  return (
    <div className="flex flex-1 flex-row">
      <div
        className={cn('flex flex-1 flex-row gap-2 overflow-y-auto', {
          'h-[calc(100vh-220px)]': leadersAndBasesExpanded,
          'h-[calc(100vh-170px)]': !leadersAndBasesExpanded,
        })}
      >
        <CPCardContent pool={data?.pool} />
      </div>
      <div
        className={cn('min-w-[250px] overflow-y-auto', {
          'h-[calc(100vh-220px)]': leadersAndBasesExpanded,
          'h-[calc(100vh-170px)]': !leadersAndBasesExpanded,
        })}
      >
        <CPDeckAndTrashCard deck={data?.deck} trash={data?.trash} />
      </div>
    </div>
  );
};

export default CPPoolAndDeckSection;
