import React from 'react';
import { useCPDeckContent } from '@/components/app/limited/CardPoolDeckDetail/CPContent/useCPDeckContent.ts';
import CPCardContent from '@/components/app/limited/CardPoolDeckDetail/CPContent/CPCardContent.tsx';
import CPDeckAndTrashCard from '@/components/app/limited/CardPoolDeckDetail/CPContent/CPDeckAndTrashCard.tsx';

export interface CPPoolAndDeckSectionProps {
  deckId?: string;
  poolId?: string;
}

const CPPoolAndDeckSection: React.FC<CPPoolAndDeckSectionProps> = ({ deckId, poolId }) => {
  const data = useCPDeckContent(deckId, poolId);

  return (
    <>
      <div className="col-span-1 md:col-span-1 lg:col-span-2 xl:col-span-3">
        <CPCardContent pool={data?.pool} />
      </div>
      <div className="col-span-1">
        <CPDeckAndTrashCard deck={data?.deck} trash={data?.trash} />
      </div>
    </>
  );
};

export default CPPoolAndDeckSection;
