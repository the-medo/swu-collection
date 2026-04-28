import { type CardListResponse, useCardList } from '@/api/lists/useCardList.ts';
import DeckBackgroundDecoration from '@/components/app/global/DeckBackgroundDecoration.tsx';
import BaseAvatar from '@/components/app/global/BaseAvatar.tsx';
import { cn } from '@/lib/utils.ts';
import { basicBaseForAspect } from '../../../../../../../../shared/lib/basicBases.ts';
import { extractDeckNameFromBrackets } from '@/components/app/tournaments/lib/extractDeckNameFromBrackets.ts';
import type {
  LiveTournamentBracketDeckSummary,
  LiveTournamentMatchEntry,
} from '../../liveTournamentTypes.ts';

type MatchTournamentPlayer =
  | LiveTournamentMatchEntry['tournamentPlayer1']
  | LiveTournamentMatchEntry['tournamentPlayer2'];

function getCardIdFromKey(key: string | undefined, cards: CardListResponse['cards'] | undefined) {
  if (!key || !cards) return undefined;
  return key in cards ? key : basicBaseForAspect[key];
}

type LiveTournamentPlayerCardProps = {
  playerDisplayName: string | null | undefined;
  tournamentPlayer: MatchTournamentPlayer;
  deck?: LiveTournamentBracketDeckSummary | null;
  gameWins?: number | null;
  rank?: number | null;
  matchRecord?: string | null;
  points?: number | null;
  isWinner?: boolean;
  isLoser?: boolean;
  isHighlighted?: boolean;
  isSelected?: boolean;
  variant?: 'bracket' | 'standing';
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

export function LiveTournamentPlayerCard({
  playerDisplayName,
  tournamentPlayer,
  deck,
  gameWins,
  rank,
  matchRecord,
  points,
  isWinner = false,
  isLoser = false,
  isHighlighted = false,
  isSelected = false,
  variant = 'bracket',
  onClick,
  onMouseEnter,
  onMouseLeave,
}: LiveTournamentPlayerCardProps) {
  const { data: cardListData } = useCardList();
  const leaderCardId = deck?.leaderCardId1 ?? tournamentPlayer?.leaderCardId ?? undefined;
  const baseCardId =
    deck?.baseCardId ??
    getCardIdFromKey(tournamentPlayer?.baseCardKey ?? undefined, cardListData?.cards);
  const leaderCard = leaderCardId ? cardListData?.cards[leaderCardId] : undefined;
  const baseCard = baseCardId ? cardListData?.cards[baseCardId] : undefined;
  const deckName = deck?.name ? extractDeckNameFromBrackets(deck.name) : undefined;
  const isClickable = !!onClick;
  const isStanding = variant === 'standing';
  const Component = isClickable ? 'button' : 'div';

  if (!playerDisplayName) {
    return (
      <div
        className={cn(
          'flex items-center rounded-md border border-dashed border-muted-foreground/20 bg-muted/20 px-2 text-[11px] text-muted-foreground',
          isStanding ? 'h-14' : 'h-16',
        )}
      >
        TBD
      </div>
    );
  }

  const secondaryParts = [
    deckName,
    matchRecord ? `${matchRecord}` : undefined,
    points !== null && points !== undefined ? `${points} pts` : undefined,
  ].filter(Boolean);

  return (
    <Component
      type={isClickable ? 'button' : undefined}
      className={cn(
        'relative w-full overflow-hidden rounded-md border bg-background/95 text-left shadow-xs transition-all duration-150',
        isStanding ? 'h-14' : 'h-16',
        isWinner && 'border-primary/60 bg-primary/5',
        isLoser && 'opacity-50',
        isHighlighted && 'border-amber-500 bg-amber-500/10 opacity-100',
        isSelected && 'border-amber-500 bg-amber-500/15 ring-1 ring-amber-500/40',
        isClickable && 'cursor-pointer hover:border-primary/50 hover:bg-muted/30',
      )}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {leaderCard && (
        <DeckBackgroundDecoration leaderCard={leaderCard} baseCard={baseCard} position="top-left">
          <BaseAvatar cardId={baseCard?.cardId} bordered={false} size="30" shape="circle" />
        </DeckBackgroundDecoration>
      )}

      <div className="relative z-20 flex h-full items-center gap-2 pl-9">
        {isStanding && rank ? (
          <div className="flex h-8 min-w-8 items-center justify-center rounded-sm bg-muted/80 text-xs font-bold text-muted-foreground">
            #{rank}
          </div>
        ) : null}
        <div className={cn('min-w-0 flex-1', isStanding ? 'text-left' : 'text-right')}>
          <h6
            className={cn(
              'mb-0! truncate leading-tight',
              isHighlighted && 'text-amber-700 dark:text-amber-300',
            )}
          >
            {playerDisplayName}
          </h6>
          {secondaryParts.length > 0 && (
            <div className="truncate text-xs text-muted-foreground">
              {secondaryParts.join(' - ')}
            </div>
          )}
        </div>
        {gameWins !== undefined && (
          <div
            className={cn(
              'flex h-full min-w-6 items-center justify-center rounded-sm px-4 text-[11px] font-bold',
              isWinner
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-muted/70 text-muted-foreground',
            )}
          >
            <h4 className="mb-0!">{gameWins ?? '-'}</h4>
          </div>
        )}
      </div>
    </Component>
  );
}
