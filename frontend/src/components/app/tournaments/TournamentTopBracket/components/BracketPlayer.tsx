import React from 'react';
import { cn } from '@/lib/utils';
import { Trophy } from 'lucide-react';
import { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks';
import { extractDeckNameFromBrackets } from '../../lib/extractDeckNameFromBrackets';
import DeckAvatar from '@/components/app/global/DeckAvatar/DeckAvatar.tsx';

interface BracketPlayerProps {
  deck: TournamentDeckResponse | null;
  isWinner?: boolean;
  showScore?: boolean;
  gameWins?: number;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
  isHighlighted?: boolean;
}

const BracketPlayer: React.FC<BracketPlayerProps> = ({
  deck,
  isWinner = false,
  showScore = false,
  gameWins = 0,
  onMouseEnter,
  onMouseLeave,
  onClick,
  isHighlighted = false,
}) => {
  if (!deck) {
    return (
      <div className="h-16 rounded-md bg-muted/30 flex items-center justify-center text-muted-foreground px-4">
        TBD
      </div>
    );
  }

  const username = deck.tournamentDeck.meleePlayerUsername || 'Unknown';

  return (
    <div
      className={cn(
        'flex p-2 border rounded-md gap-2 transition-colors duration-200 min-w-[100px]',
        ' @[510px]/bracket-detail:min-w-[170px] @[810px]/bracket-detail:min-w-[250px]',
        isWinner ? 'border-primary bg-primary/5' : 'border-muted-foreground/20',
        isHighlighted ? 'bg-amber-500/20 border-amber-500' : '',
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      <div className="flex gap-1 shrink-0">
        <DeckAvatar
          leaderCardId={deck.deck?.leaderCardId1}
          baseCardId={deck.deck?.baseCardId}
          size="40"
        />
      </div>
      <div className="flex flex-col justify-center overflow-hidden hidden @[510px]/bracket-detail:flex">
        <div
          className={cn(
            'font-medium whitespace-nowrap text-sm overflow-hidden text-ellipsis max-w-16 @[810px]/bracket-detail:max-w-32',
            isHighlighted ? 'text-amber-700 dark:text-amber-300' : '',
          )}
        >
          {username}
        </div>
        {deck.deck && deck.deck.name && (
          <div className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-16 @[810px]/bracket-detail:max-w-32">
            {extractDeckNameFromBrackets(deck.deck.name)}
          </div>
        )}
      </div>
      {showScore && (
        <div
          className={cn(
            'ml-auto px-2 py-1 flex items-center justify-center rounded-md text-lg font-bold shrink-0 min-w-8 self-stretch flex items-center justify-center',
            isWinner
              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
              : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
          )}
        >
          {gameWins}
        </div>
      )}
      {isWinner && deck.tournamentDeck.placement === 1 && !showScore && (
        <Trophy className="h-4 w-4 text-amber-500 ml-auto shrink-0" />
      )}
    </div>
  );
};

export default BracketPlayer;
