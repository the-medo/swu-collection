import * as React from 'react';
import { useCardStats } from '@/api/card-stats/useCardStats.ts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useSearch, Link, useNavigate } from '@tanstack/react-router';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useMemo } from 'react';
import CardStatsWithOptions from '@/components/app/card-stats/CardStatsWithOptions/CardStatsWithOptions.tsx';
import LeaderSelector from '@/components/app/global/LeaderSelector/LeaderSelector.tsx';
import BaseSelector from '@/components/app/global/BaseSelector/BaseSelector.tsx';
import { Route } from '@/routes/__root.tsx';
import { useTopPlayedCards } from '@/api/card-stats/useTopPlayedCards.ts';
import CardStatistic from '@/components/app/card-stats/CardStatistic/CardStatistic.tsx';
import CardImage from '@/components/app/global/CardImage.tsx';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant.ts';

interface LeaderBaseCardStatsProps {
  metaId?: number;
  tournamentId?: string;
  className?: string;
}

const LeaderBaseCardStats: React.FC<LeaderBaseCardStatsProps> = ({
  metaId,
  tournamentId,
  className,
}) => {
  const { csLeaderId, csBaseId } = useSearch({ strict: false });
  const navigate = useNavigate({ from: Route.fullPath });

  // Fetch card statistics filtered by leader and base (when both are selected)
  const { data, isLoading, error } = useCardStats({
    metaId,
    tournamentId,
    leaderCardId: csLeaderId,
    baseCardId: csBaseId,
  });

  // Fetch top played cards for top leader+base combinations (when none are selected)
  const { data: topPlayedData, isLoading: isLoadingTopPlayed, error: topPlayedError } = useTopPlayedCards({
    metaId,
    tournamentId,
    limit: 5, // Top 5 cards per leader+base combination
  });

  // Fetch card list data for additional card details
  const { data: cardListData } = useCardList();

  // Combine card stats with card details (when both leader and base are selected)
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

  // Process top played cards data (when no leader and base are selected)
  const topLeaderBaseCombosWithCards = useMemo(() => {
    if (!topPlayedData?.data || !cardListData) return [];

    // Get the top 10 leader+base combinations (or all if less than 10)
    const topCombos = Object.keys(topPlayedData.data).slice(0, 10);

    return topCombos.map(comboId => {
      // Parse the combo ID to get leader and base IDs
      const [leaderId, baseId] = comboId.split('|');

      // Get the leader and base card details
      const leaderCard = cardListData.cards[leaderId.split('-')[0]]; // Use the first leader ID if it's a pair
      const baseCard = baseId ? cardListData.cards[baseId] : undefined;

      // Get the top cards for this leader+base combination
      const topCards = topPlayedData.data[comboId].map(cardStat => {
        const card = cardListData.cards[cardStat.cardId];
        return { card, cardStat };
      });

      return {
        comboId,
        leaderId,
        baseId,
        leaderCard,
        baseCard,
        topCards
      };
    });
  }, [topPlayedData, cardListData]);

  // Show loading state if the relevant data source is loading
  if ((csLeaderId && csBaseId && isLoading) || (!csLeaderId && !csBaseId && isLoadingTopPlayed)) {
    return (
      <div className={cn('space-y-4', className)}>
        <Card>
          <CardHeader>
            <CardTitle>Cards by Leader/Base</CardTitle>
            <CardDescription>Loading statistics for cards by leader and base...</CardDescription>
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
  if ((csLeaderId && csBaseId && error) || (!csLeaderId && !csBaseId && topPlayedError)) {
    return (
      <div className={cn('space-y-4', className)}>
        <Card>
          <CardHeader>
            <CardTitle>Cards by Leader/Base</CardTitle>
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
      <div className="flex flex-row gap-8 w-full items-center justify-center">
        <div className="flex flex-col gap-2">
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
            search={prev => ({ ...prev, csLeaderId: undefined })}
            className={cn(
              'text-sm text-muted-foreground hover:text-foreground',
              !csLeaderId && 'hidden',
            )}
          >
            Clear leader
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          <BaseSelector
            trigger={null}
            baseCardId={csBaseId}
            onBaseSelected={baseId => {
              navigate({
                search: prev => ({
                  ...prev,
                  csBaseId: baseId,
                }),
              });
            }}
            size="w300"
          />
          <Link
            search={prev => ({ ...prev, csBaseId: undefined })}
            className={cn(
              'text-sm text-muted-foreground hover:text-foreground',
              !csBaseId && 'hidden',
            )}
          >
            Clear base
          </Link>
        </div>
      </div>
      {/* Card stats with options */}
      {csLeaderId && csBaseId ? (
        cardStatData.length > 0 ? (
          <CardStatsWithOptions data={cardStatData} />
        ) : (
          <div className="h-40 flex items-center justify-center">
            <p className="text-muted-foreground">
              No card statistics available for this leader/base combination
            </p>
          </div>
        )
      ) : (
        <div>
          {topLeaderBaseCombosWithCards.length > 0 ? (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Top 5 cards for the most played leader/base combinations</h2>
              {topLeaderBaseCombosWithCards.map(({ comboId, leaderId, baseId, leaderCard, baseCard, topCards }) => (
                <div key={comboId} className="space-y-2">
                  <div className="flex items-center gap-4 w-full">
                    <div className="flex flex-col gap-2 items-center">
                      <Link
                        search={prev => ({ ...prev, csLeaderId: leaderId.split('-')[0], csBaseId: baseId })}
                        className="hover:opacity-80"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <CardImage
                            card={leaderCard}
                            cardVariantId={selectDefaultVariant(leaderCard)}
                            size="w75"
                          />
                          {baseCard && (
                            <CardImage
                              card={baseCard}
                              cardVariantId={selectDefaultVariant(baseCard)}
                              size="w75"
                            />
                          )}
                        </div>
                      </Link>
                    </div>
                    {topCards.length > 0 ? (
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-4">
                        {topCards.map((item, index) => (
                          <CardStatistic
                            key={item.card.id}
                            card={item.card}
                            cardStat={item.cardStat}
                            variant="card-horizontal"
                            preTitle={`#${index + 1} `}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No cards for this leader/base combination</p>
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

export default LeaderBaseCardStats;
