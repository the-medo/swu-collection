import { type CardListResponse, useCardList } from '@/api/lists/useCardList.ts';
import DeckBackgroundDecoration from '@/components/app/global/DeckBackgroundDecoration.tsx';
import { cn } from '@/lib/utils.ts';
import { basicBaseForAspect } from '../../../../../../../../shared/lib/basicBases.ts';
import type { LiveTournamentMatchEntry } from '../../liveTournamentTypes.ts';
import BaseAvatar from '@/components/app/global/BaseAvatar.tsx';

type MatchPlayer = LiveTournamentMatchEntry['player1'] | LiveTournamentMatchEntry['player2'];
type MatchTournamentPlayer =
  | LiveTournamentMatchEntry['tournamentPlayer1']
  | LiveTournamentMatchEntry['tournamentPlayer2'];

function getCardIdFromKey(key: string | undefined, cards: CardListResponse['cards'] | undefined) {
  if (!key || !cards) return undefined;
  return key in cards ? key : basicBaseForAspect[key];
}

export function LiveBracketPlayer({
  player,
  tournamentPlayer,
  gameWins,
  isWinner,
  isLoser,
  isHighlighted,
  onMouseEnter,
  onMouseLeave,
}: {
  player: MatchPlayer;
  tournamentPlayer: MatchTournamentPlayer;
  gameWins: number | null;
  isWinner: boolean;
  isLoser: boolean;
  isHighlighted: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const { data: cardListData } = useCardList();

  const leaderCard = tournamentPlayer?.leaderCardId
    ? cardListData?.cards[tournamentPlayer.leaderCardId]
    : undefined;
  const baseCardId = getCardIdFromKey(
    tournamentPlayer?.baseCardKey ?? undefined,
    cardListData?.cards,
  );
  const baseCard = baseCardId ? cardListData?.cards[baseCardId] : undefined;

  if (!player) {
    return (
      <div className="flex h-16 items-center rounded-md border border-dashed border-muted-foreground/20 bg-muted/20 px-2 text-[11px] text-muted-foreground">
        TBD
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative h-16 overflow-hidden rounded-md border bg-background/95 transition-all duration-150',
        'shadow-xs',
        isWinner && 'border-primary/60 bg-primary/5',
        isLoser && 'opacity-50',
        isHighlighted && 'border-amber-500 bg-amber-500/10 opacity-100',
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {leaderCard && (
        <DeckBackgroundDecoration leaderCard={leaderCard} baseCard={baseCard} position="top-left">
          <BaseAvatar cardId={baseCard?.cardId} bordered={false} size="30" shape="circle" />
        </DeckBackgroundDecoration>
      )}

      <div className="relative z-20 flex h-full items-center gap-2 pl-9">
        <div className="min-w-0 flex-1 text-right">
          <h6
            className={cn(
              'truncate leading-tight mb-0!',
              isHighlighted && 'text-amber-700 dark:text-amber-300',
            )}
          >
            {player.displayName}
          </h6>
        </div>
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
      </div>
    </div>
  );
}
