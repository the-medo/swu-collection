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

  // Fetch card statistics filtered by leader and base
  const { data, isLoading, error } = useCardStats({
    metaId,
    tournamentId,
    leaderCardId: csLeaderId,
    baseCardId: csBaseId,
  });

  // Fetch card list data for additional card details
  const { data: cardListData } = useCardList();

  // Combine card stats with card details
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

  if (isLoading) {
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

  if (error) {
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
              !csLeaderId && 'hidden',
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
        <div className="h-40 flex items-center justify-center">
          <p className="text-muted-foreground">
            Please select both a leader and a base to view card statistics
          </p>
        </div>
      )}
    </div>
  );
};

export default LeaderBaseCardStats;
