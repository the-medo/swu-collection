import * as React from 'react';
import { MatchResult } from '@/components/app/statistics/useGameResults.ts';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { useCardList } from '@/api/lists/useCardList.ts';
import DeckBackgroundDecoration from '@/components/app/global/DeckBackgroundDecoration.tsx';
import { cn } from '@/lib/utils.ts';
import BaseAvatar from '@/components/app/global/BaseAvatar.tsx';
import { basicBaseForAspect } from '../../../../../../../shared/lib/basicBases.ts';
import { getResultBorderColor } from '@/components/app/statistics/lib/lib.ts';
import { useMemo } from 'react';
import MatchGames from './MatchGames.tsx';
import { formatDistanceToNow } from 'date-fns';

interface MatchResultBoxProps {
  match: MatchResult;
}

const getCardIdFromKey = (key: string | undefined, cards: any) => {
  if (!key || !cards) return undefined;
  return key in cards ? key : basicBaseForAspect[key];
};

const MatchResultBox: React.FC<MatchResultBoxProps> = ({ match }) => {
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

  const opponentName = match.games[0]?.otherData?.opponentName ?? 'Unknown';

  return (
    <div className="flex gap-2">
      <Card className="overflow-hidden relative w-[600px]">
        <div className="flex-1 relative">
          {leaderCard && (
            <DeckBackgroundDecoration
              leaderCard={leaderCard}
              baseCard={baseCard}
              position="top-left"
            >
              <BaseAvatar cardId={match.baseCardKey} bordered={false} size="40" shape="circle" />
            </DeckBackgroundDecoration>
          )}
          {opponentLeaderCard && (
            <DeckBackgroundDecoration
              leaderCard={opponentLeaderCard}
              baseCard={opponentBaseCard}
              position="top-right"
            >
              <BaseAvatar
                cardId={match.opponentBaseCardKey}
                bordered={false}
                size="40"
                shape="circle"
              />
            </DeckBackgroundDecoration>
          )}
          <CardContent className="flex p-2 relative z-10 px-50">
            <div className="flex flex-col flex-1 md:flex-row justify-around gap-4 items-center">
              <div className="flex flex-col items-center">
                <h3
                  className={cn(
                    'font-semibold text-sm border-b-3 px-1 mb-0!',
                    getResultBorderColor(match.result),
                  )}
                >
                  {match.finalWins} - {match.finalLosses}
                </h3>
                <span className="text-[10px]">vs. {opponentName}</span>
              </div>
            </div>

            <div className="flex absolute gap-2 right-40 top-10">
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(match.firstGameCreatedAt, { addSuffix: true })}
              </span>
              <Badge variant="outline" size="small">
                {match.type}
              </Badge>
            </div>
          </CardContent>
        </div>
      </Card>
      <MatchGames games={match.games} />
    </div>
  );
};

export default MatchResultBox;
