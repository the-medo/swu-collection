import * as React from 'react';
import { useCardStats } from '@/api/card-stats/useCardStats.ts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useSearch, Link, useNavigate } from '@tanstack/react-router';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useCallback, useMemo } from 'react';
import CardStatsWithOptions from '@/components/app/card-stats/CardStatsWithOptions/CardStatsWithOptions.tsx';
import LeaderSelector from '@/components/app/global/LeaderSelector/LeaderSelector.tsx';
import BaseSelector from '@/components/app/global/BaseSelector/BaseSelector.tsx';
import { Route } from '@/routes/__root.tsx';
import { useTopPlayedCards } from '@/api/card-stats/useTopPlayedCards.ts';
import CardStatistic from '@/components/app/card-stats/CardStatistic/CardStatistic.tsx';
import CardImage from '@/components/app/global/CardImage.tsx';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant.ts';
import { useTournamentMetaStore } from '@/components/app/tournaments/TournamentMeta/useTournamentMetaStore.ts';
import { getBaseKey } from '@/components/app/tournaments/TournamentMatchups/utils/getBaseKey.ts';
import { isAspect } from '@/lib/cards/isAspect.ts';
import { basicBaseForAspect } from '../../../../../../shared/lib/basicBases.ts';
import { SwuAspect } from '../../../../../../types/enums.ts';
import { isBasicBase } from '../../../../../../shared/lib/isBasicBase.ts';

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
  const { decks } = useTournamentMetaStore();
  const { csLeaderId, csBaseId } = useSearch({ strict: false });
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: cardListData } = useCardList();

  const cardStatParams = useMemo(
    () => ({
      metaId,
      tournamentId,
      leaderCardId: csLeaderId,
      baseCardId: csBaseId,
      leaderAndBase: true,
    }),
    [metaId, tournamentId, csLeaderId, csBaseId],
  );

  // Fetch card statistics filtered by leader (when a leader is selected)
  const { data, isLoading, error } = useCardStats(cardStatParams);

  const leaderBasePairsAndCounts = useMemo(() => {
    const countMap = new Map<string, number>();

    decks.forEach(deck => {
      const leaderKey = deck.deck?.leaderCardId1;
      const baseKey = getBaseKey(
        deck.deck?.baseCardId,
        deck.deckInformation?.baseAspect,
        cardListData,
      );
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
      const [leaderId, baseId] = leaderBaseKey.split('|');
      // Get the leader card details
      const leaderCard = cardListData.cards[leaderId];

      const baseCard = isAspect(baseId)
        ? cardListData.cards[basicBaseForAspect[baseId as SwuAspect]]
        : cardListData.cards[baseId];

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

  const onBaseSelected = useCallback(
    (baseId: string | undefined) => {
      if (baseId) {
        const baseCard = cardListData?.cards[baseId];
        if (baseCard && isBasicBase(baseCard)) {
          baseId = baseCard.aspects[0];
        }
      }

      navigate({
        search: prev => ({
          ...prev,
          csBaseId: baseId,
        }),
      });
    },
    [cardListData],
  );

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
        <div className="flex flex-col gap-2">
          <BaseSelector
            trigger={null}
            baseCardId={isAspect(csBaseId) ? basicBaseForAspect[csBaseId as SwuAspect] : csBaseId}
            onBaseSelected={onBaseSelected}
            size="w300"
          />
          <Link
            to="."
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
                }) => (
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
                        <span className="text-sm">Deck count: {deckCount}</span>
                      </div>
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
                ),
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
