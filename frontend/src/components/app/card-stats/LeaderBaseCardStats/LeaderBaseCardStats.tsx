import * as React from 'react';
import { useCardStats } from '@/api/card-stats/useCardStats.ts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Link, useSearch } from '@tanstack/react-router';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useMemo } from 'react';
import CardStatsWithOptions from '@/components/app/card-stats/CardStatsWithOptions/CardStatsWithOptions.tsx';
import { useTopPlayedCards } from '@/api/card-stats/useTopPlayedCards.ts';
import CardStatistic from '@/components/app/card-stats/CardStatistic/CardStatistic.tsx';
import CardImage from '@/components/app/global/CardImage.tsx';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant.ts';
import { useTournamentMetaStore } from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';
import { getBaseKey } from '@/components/app/tournaments/TournamentMatchups/utils/getBaseKey.ts';
import { isAspect } from '@/lib/cards/isAspect.ts';
import {
  basicBaseForAspect,
  basicForceBaseForAspect,
} from '../../../../../../shared/lib/basicBases.ts';
import { SwuAspect } from '../../../../../../types/enums.ts';
import LeaderBaseStatSelector from '../LeaderBaseStatSelector';

interface LeaderBaseCardStatsProps {
  metaId?: number;
  tournamentId?: string;
  tournamentGroupId?: string;
  className?: string;
}

const LeaderBaseCardStats: React.FC<LeaderBaseCardStatsProps> = ({
  metaId,
  tournamentId,
  tournamentGroupId,
  className,
}) => {
  const { decks } = useTournamentMetaStore();
  const { csLeaderId, csBaseId } = useSearch({ strict: false });
  const { data: cardListData } = useCardList();

  const cardStatParams = useMemo(
    () => ({
      metaId,
      tournamentId,
      tournamentGroupId,
      leaderCardId: csLeaderId,
      baseCardId: csBaseId,
      leaderAndBase: true,
    }),
    [metaId, tournamentId, tournamentGroupId, csLeaderId, csBaseId],
  );

  // In case of meta card statistics, deck counts are displayed from filtered tournaments,
  // but the statistics are from whole meta, for now we just hide deck counts under the leader images
  const correctDeckCount = tournamentId !== undefined || tournamentGroupId !== undefined;

  // Fetch card statistics filtered by leader (when a leader is selected)
  const { data, isLoading, error } = useCardStats(cardStatParams);

  const leaderBasePairsAndCounts = useMemo(() => {
    const countMap = new Map<string, number>();

    decks.forEach(deck => {
      const leaderKey = deck.deck?.leaderCardId1;
      const baseKey = getBaseKey(deck.deck?.baseCardId);
      const key = `${leaderKey}|${baseKey}`;
      if (key) countMap.set(key, (countMap.get(key) || 0) + 1);
    });

    return Array.from(countMap.entries())
      .map(([key, count]) => {
        return {
          leaderBaseKey: key,
          count,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [decks]);

  const leaderBasePairs = useMemo(
    () => leaderBasePairsAndCounts.map(item => item.leaderBaseKey),
    [leaderBasePairsAndCounts],
  );

  // Fetch top played cards for top leaders (when no leader is selected)
  const {
    data: topPlayedData,
    isLoading: isLoadingTopPlayed,
    error: topPlayedError,
  } = useTopPlayedCards({
    metaId,
    tournamentId,
    tournamentGroupId,
    limit: 5, // Top 5 cards per leader
    leaderBasePairs,
  });

  // Combine card stats with card details (when a leader is selected)
  const cardStatData = useMemo(() => {
    if (!cardListData || !data) return [];
    return data?.data.map(d => {
      const card = cardListData?.cards[d.cardId];
      return {
        card,
        cardStat: d,
      };
    });
  }, [data, cardListData]);

  // Process top played cards data (when no leader is selected)
  const topLeadersWithCards = useMemo(() => {
    if (!topPlayedData?.data || !cardListData) return [];

    // Get the top 10 leaders (or all if less than 10)
    const topLeaders = Object.keys(topPlayedData.data).slice(0, 10);

    return topLeaders.map(leaderBaseKey => {
      let [leaderId, baseId] = leaderBaseKey.split('|');
      // Get the leader card details
      const leaderCard = cardListData.cards[leaderId];

      let baseCard = isAspect(baseId)
        ? cardListData.cards[basicBaseForAspect[baseId as SwuAspect]]
        : cardListData.cards[baseId];

      const forceBaseId = basicForceBaseForAspect[baseId];
      if (forceBaseId) baseCard = cardListData.cards[forceBaseId];

      // Get the top cards for this leader
      const topCards = topPlayedData.data[leaderBaseKey].map(cardStat => {
        const card = cardListData.cards[cardStat.cardId];
        return { card, cardStat };
      });

      return {
        leaderBaseKey,
        leaderId,
        baseId,
        leaderCard,
        baseCard,
        topCards,
        deckCount:
          leaderBasePairsAndCounts.find(item => item.leaderBaseKey === leaderBaseKey)?.count || 0,
      };
    });
  }, [topPlayedData, cardListData, decks, leaderBasePairsAndCounts]);

  // Show loading state if either data source is loading
  if ((csLeaderId && isLoading) || (!csLeaderId && isLoadingTopPlayed)) {
    return (
      <div className={cn('space-y-4', className)}>
        <Card>
          <CardHeader>
            <CardTitle>Cards by Leader</CardTitle>
            <CardDescription>Loading statistics for cards by leader...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-40 flex items-center justify-center">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state if the relevant data source has an error
  if ((csLeaderId && error) || (!csLeaderId && topPlayedError)) {
    return (
      <div className={cn('space-y-4', className)}>
        <Card>
          <CardHeader>
            <CardTitle>Cards by Leader</CardTitle>
            <CardDescription>Error loading card statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-40 flex items-center justify-center">
              <p className="text-destructive">Failed to load card statistics</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex max-sm:flex-col gap-8 w-full items-center justify-center">
        <LeaderBaseStatSelector type="main" />
      </div>

      {/* Card stats with options */}
      {csLeaderId && csBaseId ? (
        cardStatData.length > 0 ? (
          <CardStatsWithOptions data={cardStatData} cardStatParams={cardStatParams} />
        ) : (
          <div className="h-40 flex items-center justify-center">
            <p className="text-muted-foreground">No card statistics available for this leader</p>
          </div>
        )
      ) : (
        <div>
          {topLeadersWithCards.length > 0 ? (
            <div className="space-y-6">
              {topLeadersWithCards.map(
                ({
                  leaderBaseKey,
                  leaderId,
                  baseId,
                  leaderCard,
                  baseCard,
                  topCards,
                  deckCount,
                }) => {
                  if (topCards.length === 0) return null;
                  return (
                    <div key={leaderBaseKey} className="space-y-2">
                      <div className="flex items-center gap-4 w-full">
                        <div className="flex flex-col gap-2">
                          <Link
                            to="."
                            search={prev => ({ ...prev, csLeaderId: leaderId, csBaseId: baseId })}
                            className="hover:opacity-80"
                          >
                            <CardImage
                              card={leaderCard}
                              cardVariantId={
                                leaderCard ? selectDefaultVariant(leaderCard) : undefined
                              }
                              size="w100"
                              forceHorizontal={true}
                            />
                            <CardImage
                              card={baseCard}
                              cardVariantId={baseCard ? selectDefaultVariant(baseCard) : undefined}
                              size="w100"
                              forceHorizontal={true}
                            />
                          </Link>
                          {correctDeckCount && (
                            <span className="text-sm">Deck count: {deckCount}</span>
                          )}
                        </div>
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-4">
                          {topCards.map((item, index) => (
                            <CardStatistic
                              key={item.card?.cardId}
                              card={item.card}
                              cardStat={item.cardStat}
                              cardStatParams={{
                                ...cardStatParams,
                                leaderCardId: leaderId,
                                baseCardId: baseId,
                              }}
                              variant="card-horizontal"
                              preTitle={`#${index + 1} `}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center">
              <p className="text-muted-foreground">No card statistics available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LeaderBaseCardStats;
