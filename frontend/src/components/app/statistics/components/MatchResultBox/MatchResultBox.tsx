import { statisticsStyles } from '@/components/app/statistics/statisticsStyles';
import * as React from 'react';
import { Badge } from '@/components/ui/badge.tsx';
import { useCardList, type CardListResponse } from '@/api/lists/useCardList.ts';
import { DeckArtwork } from '@/components/app/decks/DeckArtwork.tsx';
import { StatisticsDeckArtwork } from '@/components/app/statistics/common/StatisticsDeckArtwork.tsx';
import { cn } from '@/lib/utils.ts';
import { basicBaseForAspect } from '../../../../../../../shared/lib/basicBases.ts';
import { getResultText } from '@/components/app/statistics/lib/lib.ts';
import { useMemo } from 'react';
import MatchGames from './MatchGames.tsx';
import { formatDistanceToNow } from 'date-fns';
import { MatchResult } from '@/components/app/statistics/lib/MatchResult.ts';
import { parseStatisticsTimestamp } from '@/components/app/statistics/lib/date.ts';
import { ReplayButton } from '@/components/app/crossfire/ReplayButton.tsx';
import { UserDisplay } from '@/components/app/global/UserDisplay.tsx';

interface MatchResultBoxProps {
  match: MatchResult;
  artworkVariant?: 'cards' | 'portrait';
  showGames?: boolean;
  showMetadata?: boolean;
  className?: string;
  cardClassName?: string;
}

const getCardIdFromKey = (
  key: string | undefined,
  cards: CardListResponse['cards'] | undefined,
) => {
  if (!key || !cards) return undefined;
  return key in cards ? key : basicBaseForAspect[key];
};

const MatchResultBox: React.FC<MatchResultBoxProps> = ({
  match,
  artworkVariant = 'cards',
  showGames = true,
  showMetadata = true,
  className,
  cardClassName,
}) => {
  const { data: cardListData } = useCardList();

  const { leaderCard, baseCard, opponentLeaderCard, opponentBaseCard } = useMemo(() => {
    const leader = match.leaderCardId ? cardListData?.cards[match.leaderCardId] : undefined;
    const baseId = getCardIdFromKey(match.baseCardKey, cardListData?.cards);
    const base = baseId ? cardListData?.cards[baseId] : undefined;

    const opponentLeader = match.opponentLeaderCardId
      ? cardListData?.cards[match.opponentLeaderCardId]
      : undefined;
    const opponentBaseId = getCardIdFromKey(match.opponentBaseCardKey, cardListData?.cards);
    const opponentBase = opponentBaseId ? cardListData?.cards[opponentBaseId] : undefined;

    return {
      leaderCard: leader,
      baseCard: base,
      opponentLeaderCard: opponentLeader,
      opponentBaseCard: opponentBase,
    };
  }, [match, cardListData]);

  const replayGames = match.games.filter(
    game => game.gameSource === 'crossfire' && game.otherData?.crossfire?.lobbyId,
  );
  const compact = artworkVariant === 'portrait';
  const metadata = (showMetadata ||
    match.gameSource === 'crossfire' ||
    (showGames && match.games.length > 1) ||
    replayGames.length > 0) && (
    <div className={compact ? statisticsStyles.matchMetaCompact : statisticsStyles.matchMeta}>
      {showMetadata && (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span>
            {formatDistanceToNow(parseStatisticsTimestamp(match.firstGameCreatedAt), {
              addSuffix: true,
            })}
          </span>
          <Badge variant="outline" size="small">
            {match.type}
          </Badge>
        </div>
      )}
      {match.gameSource === 'crossfire' && (
        <span>
          {match.status === 'in-progress'
            ? 'Crossfire · In progress'
            : match.status === 'abandoned'
              ? 'Crossfire · Abandoned'
              : match.completionReason === 'forfeit'
                ? `Crossfire · ${match.result === 3 ? 'Won' : 'Lost'} by forfeit`
                : 'Crossfire'}
        </span>
      )}
      {showGames && match.games.length > 1 && <MatchGames games={match.games} />}
      {replayGames.length > 0 && (
        <span className="flex flex-wrap justify-center gap-0.5">
          {replayGames.map((game, index) => (
            <ReplayButton
              key={game.gameId}
              lobbyId={game.otherData.crossfire!.lobbyId}
              iconOnly
              label={
                replayGames.length > 1 ? `Replay game ${game.gameNumber ?? index + 1}` : 'Replay'
              }
            />
          ))}
        </span>
      )}
    </div>
  );
  const firstPlayer = (
    <div
      className={compact ? statisticsStyles.matchIdentity : statisticsStyles.matchPlayer}
      title={`${leaderCard?.name ?? 'Unknown leader'} / ${baseCard?.name ?? match.baseCardKey ?? 'Unknown base'}`}
    >
      {compact ? (
        <StatisticsDeckArtwork leaderId={match.leaderCardId} baseKey={match.baseCardKey} />
      ) : (
        <DeckArtwork leaderId={leaderCard?.cardId} baseId={baseCard?.cardId} size="compact" />
      )}
      {(match.user || match.userName) && (
        <div className={cn(statisticsStyles.matchPlayerName, 'text-muted-foreground')}>
          {match.user ? <UserDisplay user={match.user} className="text-[11px]" /> : match.userName}
        </div>
      )}
    </div>
  );

  return (
    <div className={cn(statisticsStyles.matchRow, className)} data-result={match.result}>
      <div className={cn('min-w-0', statisticsStyles.match, cardClassName)}>
        <div
          className={cn(
            statisticsStyles.matchMain,
            compact && 'py-3',
            compact && metadata && statisticsStyles.matchMainWithMeta,
          )}
        >
          {firstPlayer}
          <div className="flex flex-col items-center gap-1">
            <div className={statisticsStyles.matchScore} data-result={match.result}>
              <strong className={statisticsStyles.scoreNumber}>
                {match.finalWins} – {match.finalLosses}
              </strong>
              <span>
                {match.status === 'in-progress'
                  ? 'In progress'
                  : match.status === 'abandoned'
                    ? 'Abandoned'
                    : getResultText(match.result)}
              </span>
            </div>
          </div>
          <div
            className={compact ? statisticsStyles.matchOpponent : statisticsStyles.matchPlayer}
            title={`${opponentLeaderCard?.name ?? 'Unknown leader'} / ${opponentBaseCard?.name ?? match.opponentBaseCardKey ?? 'Unknown base'}`}
          >
            {artworkVariant === 'portrait' ? (
              <StatisticsDeckArtwork
                leaderId={match.opponentLeaderCardId}
                baseKey={match.opponentBaseCardKey}
                side="right"
              />
            ) : (
              <DeckArtwork
                leaderId={opponentLeaderCard?.cardId}
                baseId={opponentBaseCard?.cardId}
                size="compact"
              />
            )}
            {match.inTeamOppUserName && (
              <div className={cn(statisticsStyles.matchPlayerName, 'text-muted-foreground')}>
                {match.inTeamOpponent ? (
                  <UserDisplay user={match.inTeamOpponent} className="text-[11px]" />
                ) : (
                  match.inTeamOppUserName
                )}
              </div>
            )}
          </div>
          {compact && metadata}
        </div>
        {!compact && metadata}
      </div>
    </div>
  );
};

export default MatchResultBox;
