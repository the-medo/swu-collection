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
import { getTeamUrlPrefix } from '@/components/app/teams/lib/getTeamUrlPrefix.ts';
import { StatSectionCompact } from '@/components/app/statistics/common/StatSectionCompact.tsx';

interface DeckInfoThumbnailProps {
  teamId?: string;
  statistics?: DeckStatistics;
  statSectionVariant?: StatSectionProps['variant'];
  displayDeckBackground?: boolean;
  compactOnMobile?: boolean;
}

const DeckInfoThumbnail: React.FC<DeckInfoThumbnailProps> = ({
  teamId,
  statistics,
  statSectionVariant = 'vertical',
  displayDeckBackground = true,
  compactOnMobile = false,
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
  const gameAndMatchRecordsAreEqual =
    gameWins === matchWins && gameLosses === matchLosses;

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
    <Link
      to={`${getTeamUrlPrefix(teamId)}/statistics/decks`}
      params={{
        teamId,
      }}
      search={prev => ({ ...prev, sDeckId: deckId })}
      className="block w-full min-w-0"
    >
      <Card
        className={cn('overflow-hidden relative @container/deck-statistics-item', {
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
              className={cn({
                'origin-top-left scale-[0.65] @[720px]/deck-statistics-item:scale-100':
                  statSectionVariant === 'horizontal',
              })}
            >
              <BaseAvatar cardId={baseCardKey} bordered={false} size="40" shape="circle" />
            </DeckBackgroundDecoration>
          )}
          <CardContent
            className={cn('flex min-w-0 p-2 relative z-10 gap-4', {
              'flex-col h-full items-end justify-end': statSectionVariant === 'vertical',
              'flex-row flex-1 items-center justify-between flex-wrap':
                statSectionVariant === 'horizontal',
              'pl-28 @[720px]/deck-statistics-item:pl-45':
                displayDeckBackground && statSectionVariant === 'horizontal',
            })}
          >
            <h6
              className={cn('mb-0!', {
                'truncate text-xs w-[170px]': statSectionVariant === 'vertical',
                'w-full min-w-0 max-w-[500px] truncate @[720px]/deck-statistics-item:w-auto @[720px]/deck-statistics-item:min-w-[170px]':
                  statSectionVariant === 'horizontal',
                'max-sm:line-clamp-2 max-sm:max-w-none max-sm:whitespace-normal max-sm:text-xs max-sm:font-semibold':
                  statSectionVariant === 'horizontal' && compactOnMobile,
              })}
            >
              {deckName}
            </h6>
            <div
              className={cn('flex gap-4 flex-1', {
                'justify-between items-end': statSectionVariant === 'vertical',
                'w-full min-w-0 flex-row-reverse justify-between items-center @[720px]/deck-statistics-item:w-auto @[720px]/deck-statistics-item:justify-start':
                  statSectionVariant === 'horizontal',
              })}
            >
              <div className="flex gap-4">
                {deckId && (
                  <CopyLinkButton
                    deckId={deckId}
                    isPublic={true}
                    compact={true}
                    size="iconMedium"
                  />
                )}
              </div>
              {statSectionVariant === 'horizontal' && (
                <div className="flex flex-col gap-1 @[720px]/deck-statistics-item:hidden">
                  <StatSectionCompact
                    label="Games"
                    wins={gameWins}
                    losses={gameLosses}
                    winrate={gameWinrate}
                  />
                  <div
                    className={cn({
                      'max-sm:hidden': compactOnMobile && gameAndMatchRecordsAreEqual,
                    })}
                  >
                    <StatSectionCompact
                      label="Matches"
                      wins={matchWins}
                      losses={matchLosses}
                      winrate={matchWinrate}
                    />
                  </div>
                </div>
              )}
              <div
                className={cn('flex-wrap gap-4', {
                  flex: statSectionVariant === 'vertical',
                  'hidden @[720px]/deck-statistics-item:flex':
                    statSectionVariant === 'horizontal',
                })}
              >
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
