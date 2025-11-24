import React from 'react';
import { useCPDeckContent } from '@/components/app/limited/CardPoolDeckDetail/CPContent/useCPDeckContent.ts';
import CPCardContent from '@/components/app/limited/CardPoolDeckDetail/CPContent/CPCardContent.tsx';
import CPResultingDeck from '@/components/app/limited/CardPoolDeckDetail/CPContent/CPResultingDeck.tsx';
import CPTrash from '@/components/app/limited/CardPoolDeckDetail/CPContent/CPTrash.tsx';

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
        <CPResultingDeck deck={data?.deck} />
        <div className="mt-4">
          <CPTrash trash={data?.trash} />
        </div>
      </div>
    </>
  );
};

export default CPPoolAndDeckSection;
