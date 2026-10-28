import type { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks';
import { LeaderBaseArtwork } from '@/components/app/global/LeaderBaseArtwork';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BracketPlayerProps {
  deck?: TournamentDeckResponse | null;
  focusKey: string;
  username: string | null;
  score: number;
  isWinner: boolean;
  isHighlighted: boolean;
  setHighlightedPlayer: (username: string | null) => void;
  setSelectedDeckId: (deckId: string | undefined) => void;
}
export default function BracketPlayer({
  deck,
  focusKey,
  username,
  score,
  isWinner,
  isHighlighted,
  setHighlightedPlayer,
  setSelectedDeckId,
}: BracketPlayerProps) {
  const name = username || 'Unknown player';
  return (
    <button
      type="button"
      data-bracket-deck-trigger={focusKey}
      disabled={!deck?.deck}
      aria-label={`${name}, ${score} game wins${isWinner ? ', match winner' : ''}${deck?.deck ? '. View deck' : '. Deck unavailable'}`}
      title={name}
      onClick={() => deck?.deck && setSelectedDeckId(deck.deck.id)}
      onMouseEnter={() => setHighlightedPlayer(username)}
      onMouseLeave={() => setHighlightedPlayer(null)}
      onFocus={() => setHighlightedPlayer(username)}
      onBlur={() => setHighlightedPlayer(null)}
      className={cn(
        'flex min-h-16 w-full items-center gap-2 px-2.5 py-2 text-left transition-colors focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2 enabled:cursor-pointer enabled:hover:bg-primary/10',
        isWinner && 'bg-primary/5',
        isHighlighted && 'bg-primary/15',
      )}
    >
      {(deck?.deck?.leaderCardId1 || deck?.deck?.baseCardId) && (
        <LeaderBaseArtwork
          leaderId={deck.deck.leaderCardId1}
          baseKey={deck.deck.baseCardId}
          size="compact"
        />
      )}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-xs',
            isWinner ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground',
          )}
        >
          {name}
        </span>
      </span>
      {isWinner && <Check className="size-3 shrink-0 text-primary" aria-label="Winner" />}
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-md font-mono text-sm font-bold tabular-nums',
          isWinner ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
        )}
      >
        {score}
      </span>
    </button>
  );
}
