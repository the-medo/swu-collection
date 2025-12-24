import * as React from 'react';
import { CardStatsParams, useCardStats } from '@/api/card-stats/useCardStats.ts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { SwuAspect } from '../../../../../../types/enums.ts';
import { Link, useSearch } from '@tanstack/react-router';
import { useCardList } from '@/api/lists/useCardList.ts';
import CardStatsWithOptions from '@/components/app/card-stats/CardStatsWithOptions/CardStatsWithOptions.tsx';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import CardStatistic from '@/components/app/card-stats/CardStatistic/CardStatistic.tsx';
import { useMemo } from 'react';

interface AspectCardStatsProps {
  metaId?: number;
  tournamentId?: string;
  tournamentGroupId?: string;
  className?: string;
}

export const aspectTabOptions = ['overview', ...Object.values(SwuAspect), 'no-aspect'] as const;
type AspectTabOption = (typeof aspectTabOptions)[number];

const AspectCardStats: React.FC<AspectCardStatsProps> = ({
  metaId,
  tournamentId,
  tournamentGroupId,
  className,
}) => {
  // Get the selected aspect from search params
  const { csAspect = 'overview' } = useSearch({ strict: false });
  const selectedAspect = aspectTabOptions.includes(csAspect as AspectTabOption)
    ? (csAspect as AspectTabOption)
    : 'overview';

  const cardStatParams: CardStatsParams = useMemo(
    () => ({
      metaId,
      tournamentId,
      tournamentGroupId,
    }),
    [metaId, tournamentId, tournamentGroupId],
  );

  // Fetch card statistics
  const { data, isLoading, error } = useCardStats(cardStatParams);

  // Fetch card list data for additional card details
  const { data: cardListData } = useCardList();

  // Process and group cards by aspect
  const cardsByAspect = React.useMemo(() => {
    if (!data?.data || !cardListData) return {};

    const grouped: Record<string, any[]> = {};

    // Initialize groups for each aspect
    Object.values(SwuAspect).forEach(aspect => {
      grouped[aspect] = [];
    });
    grouped['no-aspect'] = [];

    // Group cards by aspect
    data.data.forEach(cardStat => {
      const card = cardListData.cards[cardStat.cardId];
      if (card && card.aspects) {
        const deduplicatedAspects = Array.from(new Set(card.aspects));
        if (deduplicatedAspects.length > 0) {
          deduplicatedAspects.forEach(aspect => {
            if (grouped[aspect]) {
              grouped[aspect].push({
                card,
                cardStat,
              });
            }
          });
        } else {
          grouped['no-aspect'].push({
            card,
            cardStat,
          });
        }
      }
    });

    // Sort each aspect's cards by play count (descending)
    Object.keys(grouped).forEach(aspect => {
      grouped[aspect].sort(
        (a, b) =>
          b.cardStat.countMd + b.cardStat.countSb - (a.cardStat.countMd + a.cardStat.countSb),
      );
    });

    return grouped;
  }, [data, cardListData]);

  // Get all cards for a specific aspect (for the aspect-specific view)
  const cardsForAspect = React.useMemo(() => {
    if (selectedAspect === 'overview' || !cardsByAspect[selectedAspect]) return [];
    return cardsByAspect[selectedAspect];
  }, [selectedAspect, cardsByAspect]);

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Card>
          <CardHeader>
            <CardTitle>Cards by Aspect</CardTitle>
            <CardDescription>Loading statistics for cards by aspect...</CardDescription>
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

  if (error) {
    return (
      <div className={cn('space-y-4', className)}>
        <Card>
          <CardHeader>
            <CardTitle>Cards by Aspect</CardTitle>
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
      {/* Aspect selection tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 mb-2 rounded-lg bg-muted p-1">
        {aspectTabOptions.map(tab => (
          <Link
            key={tab}
            search={prev => ({ ...prev, csAspect: tab })}
            className={cn(
              'flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              selectedAspect === tab
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab === 'overview' ? (
              'Overview'
            ) : (
              <div className="flex items-center space-x-1">
                <AspectIcon aspect={tab} size="small" />
                <span>{tab === 'no-aspect' ? 'No aspect' : tab}</span>
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* Content based on selected aspect */}
      {selectedAspect === 'overview' ? (
        <div>
          {data?.data && data.data.length > 0 ? (
            <div className="space-y-4">
              {Object.entries(cardsByAspect).map(([aspect, cards]) => (
                <div
                  key={aspect}
                  className="space-y-2 max-2xl:border-b max-2xl:border-muted-foreground max-2xl:pb-4"
                >
                  <div className="flex sm:items-center gap-4 w-full">
                    <AspectIcon aspect={aspect} />
                    {cards.length > 0 ? (
                      <div className="@container flex-1 grid grid-cols-1 @[400px]:grid-cols-2 @[600px]:grid-cols-3 @[1200px]:grid-cols-5 gap-4">
                        {cards.slice(0, 5).map((item, index) => (
                          <CardStatistic
                            key={item.card.id}
                            card={item.card}
                            cardStat={item.cardStat}
                            cardStatParams={cardStatParams}
                            variant="card-horizontal"
                            preTitle={`#${index + 1} `}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No cards for this aspect</p>
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
      ) : (
        // Aspect-specific view - show all cards for the selected aspect
        <CardStatsWithOptions data={cardsForAspect} cardStatParams={cardStatParams} />
      )}
    </div>
  );
};

export default AspectCardStats;
