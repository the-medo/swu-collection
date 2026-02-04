import * as React from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useMemo } from 'react';
import { basicBaseForAspect } from '../../../../../../../shared/lib/basicBases.ts';
import DeckBackgroundDecoration from '@/components/app/global/DeckBackgroundDecoration.tsx';
import BaseAvatar from '@/components/app/global/BaseAvatar.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { DeckStatistics } from '@/components/app/statistics/lib/deckLib.ts';
import { StatSection } from '@/components/app/statistics/common/StatSection';
import CopyLinkButton from '@/components/app/decks/DeckContents/DeckActionsMenu/components/CopyLinkButton.tsx';
import { Link } from '@tanstack/react-router';

interface DeckInfoThumbnailProps {
  statistics: DeckStatistics;
}

const getCardIdFromKey = (key: string | undefined, cards: any) => {
  if (!key || !cards) return undefined;
  return key in cards ? key : basicBaseForAspect[key];
};

const DeckInfoThumbnail: React.FC<DeckInfoThumbnailProps> = ({ statistics }) => {
  const {
    deckId,
    deckName,
    leaderCardId,
    baseCardKey,
    matchWinrate,
    gameWinrate,
    matchWins,
    matchLosses,
    gameWins,
    gameLosses,
  } = statistics;

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

  return (
    <Link to={'/statistics/decks'} search={prev => ({ ...prev, deckId })}>
      <Card className="overflow-hidden relative w-full h-[200px] min-w-[350px]">
        <div className="flex-1 relative h-full">
          {leaderCard && (
            <DeckBackgroundDecoration
              leaderCard={leaderCard}
              baseCard={baseCard}
              position="top-left"
            >
              <BaseAvatar cardId={baseCardKey} bordered={false} size="40" shape="circle" />
            </DeckBackgroundDecoration>
          )}
          <CardContent className="flex flex-col h-full p-2 relative z-10 items-end justify-end gap-4">
            <h6 className="w-[170px] truncate text-xs">{deckName}</h6>
            <div className="flex gap-4 w-full items-end justify-between">
              <div className="flex gap-4">
                <CopyLinkButton deckId={deckId} isPublic={true} compact={true} />
              </div>
              <div className="flex gap-4">
                <StatSection
                  label="Games"
                  wins={gameWins}
                  losses={gameLosses}
                  winrate={gameWinrate}
                />
                <StatSection
                  label="Matches"
                  wins={matchWins}
                  losses={matchLosses}
                  winrate={matchWinrate}
                />
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </Link>
  );
};

export default DeckInfoThumbnail;
