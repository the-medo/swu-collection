import { Button } from '@/components/ui/button.tsx';
import DeckContents from '@/components/app/decks/DeckContents/DeckContents.tsx';
import { useSetDeckInfo } from '@/components/app/decks/DeckContents/useDeckInfoStore.ts';
import { X } from 'lucide-react';
import * as React from 'react';

interface MatchupDeckViewerProps {
  deckId: string;
  onClose: () => void;
}

const MatchupDeckViewer: React.FC<MatchupDeckViewerProps> = ({ deckId, onClose }) => {
  useSetDeckInfo(deckId, false);

  return (
    <div className="relative h-full overflow-auto p-2">
      <Button
        variant="outline"
        size="iconSmall"
        className="absolute top-2 right-2 z-10"
        onClick={onClose}
        aria-label="Close deck details"
      >
        <X />
      </Button>
      <DeckContents deckId={deckId} setDeckId={() => onClose()} compact />
    </div>
  );
};

export default MatchupDeckViewer;
