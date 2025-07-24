import React from 'react';
import { cn } from '@/lib/utils';
import CardImage, { CardImageVariantProps } from '@/components/app/global/CardImage';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant';
import { Trophy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Link } from '@tanstack/react-router';

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
  extended?: boolean;
  gameWins?: number;
  gameLosses?: number;
  gameDraws?: number;
}

const DeckPlacement: React.FC<DeckPlacementProps> = ({
  leaderCard1,
  baseCard,
  leaderCard2,
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
  cardImageSize = 'w50',
  extended = false,
  gameWins = 0,
  gameLosses = 0,
  gameDraws = 0,
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
        onClick ? 'p-2 rounded-md transition-colors border' : '',
        extended ? 'w-full' : '',
        className,
      )}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex gap-1 flex-shrink-0">
        {leaderCard1 && (
          <CardImage
            card={leaderCard1}
            cardVariantId={leaderCard1 ? selectDefaultVariant(leaderCard1) : undefined}
            forceHorizontal={true}
            size={cardImageSize}
            backSideButton={false}
          />
        )}
        {leaderCard2 && (
          <div className="-ml-7">
            <CardImage
              card={leaderCard2}
              cardVariantId={leaderCard2 ? selectDefaultVariant(leaderCard2) : undefined}
              forceHorizontal={true}
              size={cardImageSize}
              backSideButton={false}
            />
          </div>
        )}
        {baseCard && (
          <div className={cn({ '-ml-6': !!leaderCard2, '-ml-2': !leaderCard2 })}>
            <CardImage
              card={baseCard}
              cardVariantId={baseCard ? selectDefaultVariant(baseCard) : undefined}
              forceHorizontal={true}
              size={cardImageSize}
              backSideButton={false}
            />
          </div>
        )}
      </div>
      {extended && (
        <div className="text-md font-bold w-[80px] flex-shrink-0">
          {gameWins}-{gameLosses}-{gameDraws}
        </div>
      )}

      <div className="flex flex-1 items-center">
        {(username || deckName) && (
          <div
            className={cn('flex flex-col justify-center overflow-hidden', {
              'flex-row gap-4': extended,
            })}
          >
            {username && (
              <div className="font-medium">
                {showPlacement && placement ? `#${placement} ${username}` : username}
                {placement === 1 && <Trophy className="h-4 w-4 text-amber-500 inline ml-2" />}
              </div>
            )}
            {!extended && deckName && (
              <div className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-32">
                {deckName}
              </div>
            )}
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
    </div>
  );
};

export default DeckPlacement;
