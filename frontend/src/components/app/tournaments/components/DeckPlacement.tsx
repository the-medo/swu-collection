import React from 'react';
import { cn } from '@/lib/utils';
import { CardImageVariantProps } from '@/components/app/global/CardImage';
import { Trophy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Link } from '@tanstack/react-router';
import DeckAvatar from '@/components/app/global/DeckAvatar/DeckAvatar.tsx';

interface DeckPlacementProps {
  leaderCard1: any;
  baseCard: any;
  leaderCard2?: any;
  username?: string;
  deckName?: string;
  placement?: number;
  showPlacement?: boolean;
  isHighlighted?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  className?: string;
  deckId?: string;
  showDeckLink?: boolean;
  cardImageSize?: CardImageVariantProps['size'];
  gameWins?: number;
  gameLosses?: number;
  gameDraws?: number;
  deckKey?: string;
}

const DeckPlacement: React.FC<DeckPlacementProps> = ({
  leaderCard1,
  baseCard,
  username,
  deckName,
  placement,
  showPlacement = false,
  isHighlighted = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  className,
  deckId,
  showDeckLink = false,
}) => {
  return (
    <div
      className={cn(
        'flex gap-2 items-center',
        onClick ? 'cursor-pointer' : '',
        isHighlighted
          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500'
          : onClick
            ? 'hover:bg-muted/50 border-transparent'
            : '',
        onClick ? 'p-1 rounded-md transition-colors border' : '',
        className,
      )}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <DeckAvatar leaderCardId={leaderCard1?.cardId} baseCardId={baseCard?.cardId} size="40" />
      <div className="flex flex-1 items-center">
        {(username || deckName) && (
          <div className={cn('flex flex-col flex-1 justify-center overflow-hidden')}>
            {username && (
              <div className="font-semibold text-sm max-w-24 truncate">
                {showPlacement && placement ? `#${placement} ${username}` : username}
                {placement === 1 && <Trophy className="h-4 w-4 text-amber-500 inline ml-2" />}
              </div>
            )}

            {showDeckLink && deckId && (
              <Button
                size="iconSmall"
                variant="outline"
                title="Open deck in new tab"
                className="ml-auto"
              >
                <Link
                  to={'/decks/$deckId'}
                  params={{ deckId }}
                  target="_blank"
                  onClick={e => e.stopPropagation()}
                >
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeckPlacement;
