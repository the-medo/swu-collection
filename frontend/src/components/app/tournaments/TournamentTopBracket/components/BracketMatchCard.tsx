import { cn } from '@/lib/utils';
import type { BracketMatch } from '../bracketModel';
import { winnerUsername } from '../bracketModel';
import BracketPlayer from './BracketPlayer';

export interface BracketInteractionProps {
  highlightedPlayer: string | null;
  setHighlightedPlayer: (username: string | null) => void;
  setSelectedDeckId: (deckId: string | undefined) => void;
}
export default function BracketMatchCard({
  entry,
  className,
  ...interaction
}: BracketInteractionProps & { entry: BracketMatch; className?: string }) {
  const { match, player1, player2 } = entry;
  const winner = winnerUsername(entry);
  return (
    <div
      className={cn(
        '@container/match overflow-hidden rounded-lg border bg-card shadow-xs',
        className,
      )}
    >
      <BracketPlayer
        {...interaction}
        focusKey={`${match.id}:p1`}
        deck={player1}
        username={match.p1Username}
        score={match.gameWin}
        isWinner={winner === match.p1Username}
        isHighlighted={interaction.highlightedPlayer === match.p1Username}
      />
      <div className="border-t border-border/60" />
      <BracketPlayer
        {...interaction}
        focusKey={`${match.id}:p2`}
        deck={player2}
        username={match.p2Username}
        score={match.gameLose}
        isWinner={!!winner && winner === match.p2Username}
        isHighlighted={!!match.p2Username && interaction.highlightedPlayer === match.p2Username}
      />
      {match.gameDraw > 0 && (
        <div className="border-t px-3 py-1 text-center text-[10px] text-muted-foreground">
          {match.gameDraw} drawn {match.gameDraw === 1 ? 'game' : 'games'}
        </div>
      )}
    </div>
  );
}
