import * as React from 'react';
import { useCardStats } from '@/api/card-stats/useCardStats.ts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useSearch, Link, useNavigate } from '@tanstack/react-router';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useMemo } from 'react';
import CardStatsWithOptions from '@/components/app/card-stats/CardStatsWithOptions/CardStatsWithOptions.tsx';
import LeaderSelector from '@/components/app/global/LeaderSelector/LeaderSelector.tsx';
import { Route } from '@/routes/__root.tsx';
import { useTopPlayedCards } from '@/api/card-stats/useTopPlayedCards.ts';
import CardStatistic from '@/components/app/card-stats/CardStatistic/CardStatistic.tsx';
import CardImage from '@/components/app/global/CardImage.tsx';
import { useTournamentMetaStore } from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant.ts';

interface LeaderCardStatsProps {
  metaId?: number;
  tournamentId?: string;
  className?: string;
}

const LeaderCardStats: React.FC<LeaderCardStatsProps> = ({ metaId, tournamentId, className }) => {
  const { decks } = useTournamentMetaStore();
  const { csLeaderId } = useSearch({ strict: false });
  const navigate = useNavigate({ from: Route.fullPath });

  const cardStatParams = useMemo(
    () => ({
      metaId,
      tournamentId,
      leaderCardId: csLeaderId,
    }),
    [metaId, tournamentId, csLeaderId],
  );

  // Fetch card statistics filtered by leader (when a leader is selected)
  const { data, isLoading, error } = useCardStats(cardStatParams);

  const leaderIdsAndCounts = useMemo(() => {
    const countMap = new Map<string, number>();

    decks.forEach(deck => {
      const key = deck.deck?.leaderCardId1;
      if (key) countMap.set(key, (countMap.get(key) || 0) + 1);
    });

    return Array.from(countMap.entries())
      .map(([key, count]) => {
        return {
          leaderId: key,
          count,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [decks]);

  const leaderIds = useMemo(
    () => leaderIdsAndCounts.map(item => item.leaderId),
    [leaderIdsAndCounts],
  );

  // Fetch top played cards for top leaders (when no leader is selected)
  const {
    data: topPlayedData,
    isLoading: isLoadingTopPlayed,
    error: topPlayedError,
  } = useTopPlayedCards({
    metaId,
    tournamentId,
    limit: 5, // Top 5 cards per leader
    leaderIds,
  });

  // Fetch card list data for additional card details
  const { data: cardListData } = useCardList();

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

    return topLeaders.map(leaderId => {
      // Get the leader card details
      const leaderCard = cardListData.cards[leaderId]; // Use the first leader ID if it's a pair

      // Get the top cards for this leader
      const topCards = topPlayedData.data[leaderId].map(cardStat => {
        const card = cardListData.cards[cardStat.cardId];
        return { card, cardStat };
      });

      return {
        leaderId,
        leaderCard,
        topCards,
        deckCount: leaderIdsAndCounts.find(item => item.leaderId === leaderId)?.count || 0,
      };
    });
  }, [topPlayedData, cardListData, decks, leaderIdsAndCounts]);

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
      <div className="flex flex-col gap-2 w-full items-center">
        <LeaderSelector
          trigger={null}
          leaderCardId={csLeaderId}
          onLeaderSelected={leaderId => {
            navigate({
              search: prev => ({
                ...prev,
                csLeaderId: leaderId,
              }),
            });
          }}
          size="w300"
        />
        <Link
          to="."
          search={prev => ({ ...prev, csLeaderId: undefined })}
          className={cn(
            'text-sm text-muted-foreground hover:text-foreground',
            !csLeaderId && 'hidden',
          )}
        >
          Clear leader
        </Link>
      </div>

      {/* Card stats with options */}
      {csLeaderId ? (
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
              {topLeadersWithCards.map(({ leaderId, leaderCard, topCards, deckCount }) => (
                <div key={leaderId} className="space-y-2">
                  <div className="flex items-center gap-4 w-full">
                    {leaderCard && (
                      <div className="flex flex-col gap-2">
                        <Link
                          to="."
                          search={prev => ({ ...prev, csLeaderId: leaderId })}
                          className="hover:opacity-80"
                        >
                          <CardImage
                            card={leaderCard}
                            cardVariantId={selectDefaultVariant(leaderCard)}
                            size="w200"
                            forceHorizontal={true}
                          />
                        </Link>
                        <span className="text-sm">Deck count: {deckCount}</span>
                      </div>
                    )}
                    {topCards.length > 0 ? (
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-4">
                        {topCards.map((item, index) => (
                          <CardStatistic
                            key={item.card?.cardId}
                            card={item.card}
                            cardStat={item.cardStat}
                            cardStatParams={cardStatParams}
                            variant="card-horizontal"
                            preTitle={`#${index + 1} `}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No cards for this leader</p>
                    )}
                  </div>
                </div>
              ))}
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

export default LeaderCardStats;
