import React from 'react';
import { useBoardDeckData } from '@/components/app/global/BoardSelect/useBoardDeckData.ts';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import { Alert } from '@/components/ui/alert.tsx';

interface DeckBoardCardCountsProps {
  deckId: string;
}

const DeckBoardCardCounts: React.FC<DeckBoardCardCountsProps> = ({ deckId }) => {
  const boardCardCounts = useBoardDeckData(deckId);
  const { data: deckData } = useGetDeck(deckId);
  const selectedVersion =
    deckData?.reference?.kind === 'sealed-version' ? deckData.reference : null;

  return (
    <div className="flex gap-2 items-center text-sm ml-2">
      <span className="font-semibold">{boardCardCounts[1]}</span>
      <span>maindeck</span>
      <span>/</span>
      <span className="font-semibold">{boardCardCounts[2]}</span>
      <span>sideboard</span>
      {selectedVersion && (
        <Alert variant="info" size="xs" className="ml-1 w-auto whitespace-nowrap">
          Version {selectedVersion.versionNumber} of this deck — not editable
        </Alert>
      )}
    </div>
  );
};

export default DeckBoardCardCounts;
