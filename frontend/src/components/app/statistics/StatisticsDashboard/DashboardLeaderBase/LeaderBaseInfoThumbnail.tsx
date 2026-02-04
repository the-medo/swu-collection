import * as React from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useMemo } from 'react';
import { basicBaseForAspect } from '../../../../../../../shared/lib/basicBases.ts';
import DeckBackgroundDecoration from '@/components/app/global/DeckBackgroundDecoration.tsx';
import BaseAvatar from '@/components/app/global/BaseAvatar.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { DeckStatistics } from '@/components/app/statistics/lib/deckLib.ts';
import { Link } from '@tanstack/react-router';
import DeckInfoThumbnailCompact from '@/components/app/statistics/StatisticsDashboard/DashboardDecks/DeckInfoThumbnailCompact.tsx';
import { StatSection } from '@/components/app/statistics/common/StatSection.tsx';

export interface LeaderBaseInfoThumbnailProps {
  statistics: DeckStatistics;
  deckStatistics: Record<string, DeckStatistics | undefined>;
}

const getCardIdFromKey = (key: string | undefined, cards: any) => {
  if (!key || !cards) return undefined;
  return key in cards ? key : basicBaseForAspect[key];
};

const LeaderBaseInfoThumbnail: React.FC<LeaderBaseInfoThumbnailProps> = ({
  statistics,
  deckStatistics,
}) => {
  const {
    leaderCardId,
    baseCardKey,
    matchWinrate,
    gameWinrate,
    matchWins,
    matchLosses,
    gameWins,
    gameLosses,
    matches,
  } = statistics;

  const { data: cardListData } = useCardList();

  const recentDecks = useMemo(() => {
    const recentDecksMap: Record<
      string,
      {
        deckId: string;
        deckName?: string;
        lastPlayed?: string;
      }
    > = {};
    matches.forEach(m => {
      const deckId = m.deckId;
      if (!deckId) return;

      const deckName = m.games[0]?.otherData?.deckInfo?.name;
      const playedAt = m.firstGameCreatedAt;

      if (!recentDecksMap[deckId]) {
        recentDecksMap[deckId] = {
          deckId,
          deckName,
          lastPlayed: playedAt,
        };
      } else {
        if (!recentDecksMap[deckId].lastPlayed || recentDecksMap[deckId].lastPlayed < playedAt) {
          recentDecksMap[deckId].lastPlayed = playedAt;
        }
      }
    });

    return Object.values(recentDecksMap)
      .sort((a, b) => {
        if (!a.lastPlayed || !b.lastPlayed) return 0;
        return new Date(b.lastPlayed).getTime() - new Date(a.lastPlayed).getTime();
      })
      .slice(0, 3);
  }, [matches]);

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
    <Link to={'/statistics/decks'} search={prev => ({ ...prev, leaderCardId, baseCardKey })}>
      <Card className="overflow-hidden relative w-full h-full min-h-[200px] min-w-[350px] hover:shadow-md">
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
          <CardContent className="flex flex-col h-full p-2 pt-12 relative z-10 items-start justify-start gap-4">
            <div className="flex gap-4 w-full items-end justify-end">
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
            {recentDecks.map(deck => (
              <DeckInfoThumbnailCompact
                key={deck.lastPlayed}
                statistics={deckStatistics[deck.deckId]}
              />
            ))}
          </CardContent>
        </div>
      </Card>
    </Link>
  );
};

export default LeaderBaseInfoThumbnail;
