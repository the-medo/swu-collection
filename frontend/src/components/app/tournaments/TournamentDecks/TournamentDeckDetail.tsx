import * as React from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
import { X } from 'lucide-react';
import DeckContents from '@/components/app/decks/DeckContents/DeckContents.tsx';

interface TournamentDeckDetailProps {
  highlightedCardId?: string;
  deckIdSearchParam: 'maDeckId' | 'csDeckId';
}

const TournamentDeckDetail: React.FC<TournamentDeckDetailProps> = ({
  highlightedCardId,
  deckIdSearchParam,
}) => {
  const search = useSearch({ strict: false });
  const selectedDeckId = search[deckIdSearchParam];

  const navigate = useNavigate();
  const setSelectedDeckId = (value: string | undefined) => {
    navigate({
      to: '.',
      search: prev => ({ ...prev, [deckIdSearchParam]: value }),
    });
  };

  return (
    <div
      className="scroll-smooth flex-1 lg:mt-0 relative h-auto lg:h-[calc(100vh-200px)] overflow-auto border rounded-md p-2"
      id="tournament-deck-detail"
    >
      {selectedDeckId ? (
        <>
          <Button
            variant="outline"
            size="iconSmall"
            className="absolute top-2 right-2 z-10"
            onClick={() => setSelectedDeckId(undefined)}
          >
            <X />
          </Button>
          <DeckContents
            deckId={selectedDeckId}
            setDeckId={setSelectedDeckId}
            highlightedCardId={highlightedCardId}
          />
        </>
      ) : (
        <div className="flex w-full h-full items-center justify-center">
          Select a deck to view details
        </div>
      )}
    </div>
  );
};
export default TournamentDeckDetail;
