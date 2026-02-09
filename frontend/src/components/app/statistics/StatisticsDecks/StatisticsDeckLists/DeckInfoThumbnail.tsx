import * as React from 'react';
import { useMemo } from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import DeckBackgroundDecoration from '@/components/app/global/DeckBackgroundDecoration.tsx';
import BaseAvatar from '@/components/app/global/BaseAvatar.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { DeckStatistics } from '@/components/app/statistics/lib/deckLib.ts';
import { StatSection, StatSectionProps } from '@/components/app/statistics/common/StatSection.tsx';
import CopyLinkButton from '@/components/app/decks/DeckContents/DeckActionsMenu/components/CopyLinkButton.tsx';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils.ts';
import { getCardIdFromKey } from '@/components/app/statistics/lib/lib.ts';

interface DeckInfoThumbnailProps {
  statistics?: DeckStatistics;
  statSectionVariant?: StatSectionProps['variant'];
  displayDeckBackground?: boolean;
}

const DeckInfoThumbnail: React.FC<DeckInfoThumbnailProps> = ({
  statistics,
  statSectionVariant = 'vertical',
  displayDeckBackground = true,
}) => {
  const deckId = statistics?.deckId;
  const deckName = statistics?.deckName;
  const leaderCardId = statistics?.leaderCardId;
  const baseCardKey = statistics?.baseCardKey;
  const matchWinrate = statistics?.matchWinrate;
  const gameWinrate = statistics?.gameWinrate;
  const matchWins = statistics?.matchWins;
  const matchLosses = statistics?.matchLosses;
  const gameWins = statistics?.gameWins;
  const gameLosses = statistics?.gameLosses;

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
    <Link to={'/statistics/decks'} search={prev => ({ ...prev, sDeckId: deckId })}>
      <Card
        className={cn('overflow-hidden relative', {
          'w-full h-[200px] min-w-[350px]': statSectionVariant === 'vertical',
          'w-full': statSectionVariant === 'horizontal',
        })}
      >
        <div className="flex-1 relative h-full">
          {leaderCard && displayDeckBackground && (
            <DeckBackgroundDecoration
              leaderCard={leaderCard}
              baseCard={baseCard}
              position="top-left"
            >
              <BaseAvatar cardId={baseCardKey} bordered={false} size="40" shape="circle" />
            </DeckBackgroundDecoration>
          )}
          <CardContent
            className={cn('flex p-2 relative z-10 gap-4', {
              'flex-col h-full items-end justify-end': statSectionVariant === 'vertical',
              'flex-row flex-1 items-center justify-between flex-wrap':
                statSectionVariant === 'horizontal',
              'pl-45': displayDeckBackground && statSectionVariant === 'horizontal',
            })}
          >
            <h6
              className={cn('mb-0!', {
                'truncate text-xs w-[170px]': statSectionVariant === 'vertical',
                'min-w-[170px] max-w-[500px] ': statSectionVariant === 'horizontal',
              })}
            >
              {deckName}
            </h6>
            <div
              className={cn('flex gap-4 flex-1', {
                'justify-between items-end': statSectionVariant === 'vertical',
                'flex-row-reverse justify-start items-center': statSectionVariant === 'horizontal',
              })}
            >
              <div className="flex gap-4">
                {deckId && <CopyLinkButton deckId={deckId} isPublic={true} compact={true} />}
              </div>
              <div className="flex flex-wrap gap-4">
                <StatSection
                  label="Games"
                  wins={gameWins}
                  losses={gameLosses}
                  winrate={gameWinrate}
                  variant={statSectionVariant}
                />
                <StatSection
                  label="Matches"
                  wins={matchWins}
                  losses={matchLosses}
                  winrate={matchWinrate}
                  variant={statSectionVariant}
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
