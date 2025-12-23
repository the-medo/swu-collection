import React from 'react';
import { useBoardDeckData } from '@/components/app/global/BoardSelect/useBoardDeckData.ts';

interface DeckBoardCardCountsProps {
  deckId: string;
}

const DeckBoardCardCounts: React.FC<DeckBoardCardCountsProps> = ({ deckId }) => {
  const boardCardCounts = useBoardDeckData(deckId);

  return (
    <div className="flex gap-2 items-center text-sm ml-2">
      <span className="font-semibold">{boardCardCounts[1]}</span>
      <span>maindeck</span>
      <span>/</span>
      <span className="font-semibold">{boardCardCounts[2]}</span>
      <span>sideboard</span>
    </div>
  );
};

export default DeckBoardCardCounts;
