import React from 'react';
import { toast } from '@/hooks/use-toast.ts';
import type { Deck } from '../../../../../../types/Deck.ts';
import { DeckArtwork } from '@/components/app/decks/DeckArtwork.tsx';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
import { Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

export interface DeckCardProps {
  deck: Deck;
  className?: string;
}

const DeckCard: React.FC<DeckCardProps> = ({ deck, className }) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/limited/deck/${deck.id}`);
      toast({ title: 'Deck link copied' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy the deck link.' });
    }
  };

  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-md border border-border bg-card/60 p-2 hover:bg-card transition-colors flex flex-col items-center',
        className,
      )}
    >
      <div className="flex w-full min-w-0 items-center justify-between gap-2 mb-2">
        <Link to={`/limited/deck/$deckId`} params={{ deckId: deck.id }} className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{deck.name || 'Untitled deck'}</div>
        </Link>
        <Button
          variant="ghost"
          size="iconMedium"
          className="shrink-0"
          onClick={handleCopy}
          aria-label="Copy deck link"
        >
          <LinkIcon className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex justify-center w-full py-4">
        <DeckArtwork
          leaderId={deck.leaderCardId1}
          leader2Id={deck.leaderCardId2}
          baseId={deck.baseCardId}
        />
      </div>
    </div>
  );
};

export default DeckCard;
