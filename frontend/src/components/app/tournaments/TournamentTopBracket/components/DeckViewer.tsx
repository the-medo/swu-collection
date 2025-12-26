import React from 'react';
import { Button } from '@/components/ui/button.tsx';
import { X } from 'lucide-react';
import DeckContents from '@/components/app/decks/DeckContents/DeckContents.tsx';
import { useSetDeckInfo } from '@/components/app/decks/DeckContents/useDeckInfoStore.ts';
import { cn } from '@/lib/utils.ts';

interface DeckViewerProps {
  selectedDeckId: string;
  setSelectedDeckId: (deckId: string | undefined) => void;
  compact?: boolean;
}

const DeckViewer: React.FC<DeckViewerProps> = ({ selectedDeckId, setSelectedDeckId, compact }) => {
  useSetDeckInfo(selectedDeckId, false);

  return (
    <div className={cn('flex-1 mt-8 lg:mt-0 relative')}>
      <Button
        variant="outline"
        size="iconSmall"
        className="absolute top-2 right-2 z-10"
        onClick={() => setSelectedDeckId(undefined)}
      >
        <X />
      </Button>
      <DeckContents deckId={selectedDeckId} setDeckId={setSelectedDeckId} compact={compact} />
    </div>
  );
};

export default DeckViewer;
