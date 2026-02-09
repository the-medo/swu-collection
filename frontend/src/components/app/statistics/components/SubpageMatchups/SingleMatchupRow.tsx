import * as React from 'react';
import { MatchupResult } from '@/components/app/statistics/lib/useAnalyzeMatchups.ts';
import BaseAvatar from '@/components/app/global/BaseAvatar.tsx';
import { useCardList } from '@/api/lists/useCardList.ts';
import DeckBackgroundDecoration from '@/components/app/global/DeckBackgroundDecoration.tsx';
import { useMemo } from 'react';
import { getCardIdFromKey } from '@/components/app/statistics/lib/lib.ts';
import { StatSection } from '@/components/app/statistics/common/StatSection.tsx';

interface SingleMatchupRowProps {
  opponentDeckKey: string;
  result: MatchupResult;
}

const SingleMatchupRow: React.FC<SingleMatchupRowProps> = ({ opponentDeckKey, result }) => {
  const { data: cardList } = useCardList();

  const [leaderCardId, baseCardKey] = opponentDeckKey.split('|');

  const matchWinrate =
    result.matchesTotal > 0 ? (result.matchesWon / result.matchesTotal) * 100 : 0;
  const gameWinrate = result.gamesTotal > 0 ? (result.gamesWon / result.gamesTotal) * 100 : 0;

  const { leaderCard, baseCard } = useMemo(() => {
    const leader = leaderCardId ? cardList?.cards[leaderCardId] : undefined;
    const baseId = getCardIdFromKey(baseCardKey, cardList?.cards);
    const base = baseId ? cardList?.cards[baseId] : undefined;

    return {
      leaderCard: leader,
      baseCard: base,
    };
  }, [leaderCardId, baseCardKey, cardList]);
  const leaderName = leaderCard?.name ?? 'Unknown Leader';

  return (
    <tr className="border-b last:border-0 hover:bg-muted/50 transition-colors">
      <td className="h-[50px]">
        <div className="overflow-hidden relative h-full">
          <DeckBackgroundDecoration leaderCard={leaderCard} baseCard={baseCard} position="top-left">
            <BaseAvatar cardId={baseCardKey} bordered={false} size="40" shape="circle" />
          </DeckBackgroundDecoration>
        </div>
      </td>
      <td className="py-3">
        <div className="flex flex-col">
          <span className="font-medium text-sm">{leaderName}</span>
          <span className="text-xs text-muted-foreground">{baseCardKey}</span>
        </div>
      </td>
      <td className="py-3 px-4 text-center">
        <div className="flex flex-col">
          <StatSection
            variant="horizontal"
            wins={result.matchesWon}
            losses={result.matchesLost}
            winrate={matchWinrate}
            percentageVariant="horizontal"
          />
        </div>
      </td>
      <td className="py-3 px-4 text-center">
        <div className="flex flex-col">
          <StatSection
            variant="horizontal"
            wins={result.gamesWon}
            losses={result.gamesLost}
            winrate={gameWinrate}
            percentageVariant="horizontal"
          />
        </div>
      </td>
    </tr>
  );
};

export default SingleMatchupRow;
