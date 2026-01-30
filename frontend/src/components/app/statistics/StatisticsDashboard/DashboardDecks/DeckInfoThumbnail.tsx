import * as React from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useMemo } from 'react';
import { basicBaseForAspect } from '../../../../../../../shared/lib/basicBases.ts';
import DeckBackgroundDecoration from '@/components/app/global/DeckBackgroundDecoration.tsx';
import BaseAvatar from '@/components/app/global/BaseAvatar.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';

interface DeckInfoThumbnailProps {
  leaderCardId: string;
  baseCardKey: string;
  matchWinrate: number;
  gameWinrate: number;
  matchWins: number;
  matchLosses: number;
  gameWins: number;
  gameLosses: number;
}

const getCardIdFromKey = (key: string | undefined, cards: any) => {
  if (!key || !cards) return undefined;
  return key in cards ? key : basicBaseForAspect[key];
};

const DeckInfoThumbnail: React.FC<DeckInfoThumbnailProps> = ({
  leaderCardId,
  baseCardKey,
  matchWinrate,
  gameWinrate,
  matchWins,
  matchLosses,
  gameWins,
  gameLosses,
}) => {
  const { data: cardListData } = useCardList();

  const { leaderCard, baseCard } = useMemo(() => {
    const leader = leaderCardId ? cardListData?.cards[leaderCardId] : undefined;
    const baseId = getCardIdFromKey(baseCardKey, cardListData?.cards);
    const base = baseId ? cardListData?.cards[baseId] : undefined;

    return {
      leaderCard: leader,
      baseCard: base,
    };
  }, [leaderCardId, baseCardKey, cardListData]);

  const getWRColor = (wr: number) => {
    if (wr > 50) return 'text-green-600';
    if (wr < 50) return 'text-red-600';
    return 'text-black';
  };

  const StatSection: React.FC<{
    label: string;
    wins: number;
    losses: number;
    winrate: number;
  }> = ({ label, wins, losses, winrate }) => (
    <div className="flex flex-col items-center">
      <span className="text-[10px] font-bold uppercase text-muted-foreground mb-1">{label}</span>
      <div className="bg-muted/50 rounded-lg p-2 flex flex-col items-center min-w-[80px]">
        <h4 className="text-lg font-black leading-none mb-0!">
          {wins}W-{losses}L
        </h4>
        <span className={`text-xs font-bold mt-1 ${getWRColor(winrate)}`}>
          {winrate.toFixed(1)}% WR
        </span>
      </div>
    </div>
  );

  return (
    <Card className="overflow-hidden relative w-full h-[200px] min-w-[300px]">
      <div className="flex-1 relative h-full">
        {leaderCard && (
          <DeckBackgroundDecoration leaderCard={leaderCard} baseCard={baseCard} position="top-left">
            <BaseAvatar cardId={baseCardKey} bordered={false} size="40" shape="circle" />
          </DeckBackgroundDecoration>
        )}
        <CardContent className="flex flex-col h-full p-2 relative z-10 items-end justify-end gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">
              Total matches
            </span>
            <div className="bg-muted/50 rounded-lg p-1 flex flex-col items-center">
              <h5 className="mb-0!">{matchWins + matchLosses}</h5>
            </div>
          </div>

          <div className="flex gap-4">
            <StatSection label="Games" wins={gameWins} losses={gameLosses} winrate={gameWinrate} />
            <StatSection
              label="Matches"
              wins={matchWins}
              losses={matchLosses}
              winrate={matchWinrate}
            />
          </div>
        </CardContent>
      </div>
    </Card>
  );
};

export default DeckInfoThumbnail;
