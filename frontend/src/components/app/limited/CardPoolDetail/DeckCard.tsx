import React from 'react';
import type { Deck } from '../../../../../../types/Deck.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import CardImage from '@/components/app/global/CardImage.tsx';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant.ts';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
import { Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

export interface DeckCardProps {
  deck: Deck;
  className?: string;
}

const DeckCard: React.FC<DeckCardProps> = ({ deck, className }) => {
  const { data: cardList } = useCardList();

  const leader1 = deck.leaderCardId1 ? cardList?.cards[deck.leaderCardId1] : undefined;
  const leader2 = deck.leaderCardId2 ? cardList?.cards[deck.leaderCardId2] : undefined;
  const base = deck.baseCardId ? cardList?.cards[deck.baseCardId] : undefined;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`https://swubase.com/decks/${deck.id}`);
    } catch (e) {}
  };

  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-md border border-border bg-card/60 p-2 hover:bg-card transition-colors flex flex-col items-center',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link to={`/limited/deck/$deckId`} params={{ deckId: deck.id }} className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{deck.name || 'Untitled deck'}</div>
        </Link>
        <Button variant="ghost" size="iconMedium" className="shrink-0" onClick={handleCopy}>
          <LinkIcon className="w-4 h-4" />
        </Button>
      </div>

      <div className="relative w-full max-w-full overflow-hidden">
        <div className="flex justify-center items-center w-full gap-1 min-w-0">
          <div className="shrink-0">
            <CardImage
              card={leader1}
              cardVariantId={leader1 ? selectDefaultVariant(leader1) : undefined}
              forceHorizontal={true}
              size="w100"
              backSideButton={false}
            >
              No leader
            </CardImage>
          </div>
          {leader2 && (
            <div className="-ml-14 shrink-0">
              <CardImage
                card={leader2}
                cardVariantId={leader2 ? selectDefaultVariant(leader2) : undefined}
                forceHorizontal={true}
                size="w100"
                backSideButton={false}
              />
            </div>
          )}
          <div className={cn('shrink-0', { '-ml-12': !!leader2 })}>
            <CardImage
              card={base}
              cardVariantId={base ? selectDefaultVariant(base) : undefined}
              forceHorizontal={true}
              size="w100"
              backSideButton={false}
            >
              No base
            </CardImage>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeckCard;
