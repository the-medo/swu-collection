import * as React from 'react';
import { useCardStats } from '@/api/card-stats/useCardStats.ts';
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CardStatsTabProps {
  tournamentIds: string[];
  metaId?: number;
}

const CardStatsTab: React.FC<CardStatsTabProps> = ({ tournamentIds, metaId }) => {
  // Determine whether to use metaId or tournamentId
  const params = useMemo(() => {
    if (metaId) {
      return { metaId };
    } else if (tournamentIds.length === 1) {
      return { tournamentId: tournamentIds[0] };
    }
    return {};
  }, [metaId, tournamentIds]);

  // Fetch card statistics
  const { data, isLoading, error } = useCardStats(params);

  return (
    <div className={cn('space-y-4')}>
      <Card>
        <CardHeader>
          <CardTitle>Card Statistics</CardTitle>
          <CardDescription>
            Statistics for cards used in {metaId ? 'this meta' : 'this tournament'}
          </CardDescription>
        </CardHeader>
        <CardContent>{JSON.stringify(data)}</CardContent>
      </Card>
    </div>
  );
};

export default CardStatsTab;
