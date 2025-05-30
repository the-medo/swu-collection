import * as React from 'react';
import { useCardStats } from '@/api/card-stats/useCardStats.ts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useMemo } from 'react';
import CardStatsWithOptions from '@/components/app/card-stats/CardStatsWithOptions/CardStatsWithOptions.tsx';

interface AllCardStatsProps {
  metaId?: number;
  tournamentId?: string;
  className?: string;
}

const AllCardStats: React.FC<AllCardStatsProps> = ({ metaId, tournamentId, className }) => {
  const { data, isLoading, error } = useCardStats({
    metaId,
    tournamentId,
  });
  const { data: cardListData } = useCardList();

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

  const cardStatParams = useMemo(() => ({ metaId, tournamentId }), [metaId, tournamentId]);

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Card>
          <CardHeader>
            <CardTitle>All Cards Statistics</CardTitle>
            <CardDescription>Loading statistics for all cards...</CardDescription>
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
            <CardTitle>All Cards Statistics</CardTitle>
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

  return <CardStatsWithOptions data={cardStatData} cardStatParams={cardStatParams} />;
};

export default AllCardStats;
