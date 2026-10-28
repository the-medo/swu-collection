import React from 'react';
import { Button } from '@/components/ui/button.tsx';
import { ArrowLeft } from 'lucide-react';
import DeckContents from '@/components/app/decks/DeckContents/DeckContents.tsx';
import { useSetDeckInfo } from '@/components/app/decks/DeckContents/useDeckInfoStore.ts';

interface DeckViewerProps {
  selectedDeckId: string;
  setSelectedDeckId: (deckId: string | undefined) => void;
  compact?: boolean;
  backLabel?: string;
}

const DeckViewer: React.FC<DeckViewerProps> = ({
  selectedDeckId,
  setSelectedDeckId,
  compact,
  backLabel = 'Back',
}) => {
  useSetDeckInfo(selectedDeckId, false);

  return (
    <div className="min-w-0 flex-1">
      <Button
        data-deck-back
        aria-label={backLabel}
        variant="outline"
        size="sm"
        className="mb-4"
        onClick={() => setSelectedDeckId(undefined)}
      >
        <ArrowLeft className="size-4" /> {backLabel}
      </Button>
      <DeckContents deckId={selectedDeckId} setDeckId={setSelectedDeckId} compact={compact} />
    </div>
  );
};

export default DeckViewer;
