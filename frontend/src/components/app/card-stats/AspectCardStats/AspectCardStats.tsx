import * as React from 'react';
import { useCardStats } from '@/api/card-stats/useCardStats.ts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { SwuAspect } from '../../../../../../types/enums.ts';

interface AspectCardStatsProps {
  metaId?: number;
  tournamentId?: string;
  className?: string;
}

const AspectCardStats: React.FC<AspectCardStatsProps> = ({ metaId, tournamentId, className }) => {
  // Fetch card statistics without any filtering first
  // In a real implementation, you might want to fetch statistics for each aspect separately
  const { data, isLoading, error } = useCardStats({
    metaId,
    tournamentId,
  });

  // Group cards by aspect (this is a simplified example)
  const cardsByAspect = React.useMemo(() => {
    if (!data?.data) return {};
    
    const grouped: Record<string, typeof data.data> = {};
    
    // Initialize groups for each aspect
    Object.values(SwuAspect).forEach(aspect => {
      grouped[aspect] = [];
    });
    
    // Group cards by aspect (this is simplified and would need to be adjusted based on actual data structure)
    data.data.forEach(card => {
      // This is a placeholder - in a real implementation, you would need to determine the aspect of each card
      // For now, we're just putting all cards in the "AGGRESSION" aspect as an example
      const aspect = SwuAspect.AGGRESSION;
      if (!grouped[aspect]) {
        grouped[aspect] = [];
      }
      grouped[aspect].push(card);
    });
    
    return grouped;
  }, [data]);

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Card>
          <CardHeader>
            <CardTitle>Cards by Aspect</CardTitle>
            <CardDescription>
              Loading statistics for cards by aspect...
            </CardDescription>
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
            <CardDescription>
              Error loading card statistics
            </CardDescription>
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
      <Card>
        <CardHeader>
          <CardTitle>Cards by Aspect</CardTitle>
          <CardDescription>
            Statistics for cards grouped by aspect in {metaId ? 'this meta' : 'this tournament'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data?.data && data.data.length > 0 ? (
            <div className="space-y-6">
              {Object.entries(cardsByAspect).map(([aspect, cards]) => (
                <div key={aspect} className="space-y-2">
                  <h3 className="text-lg font-semibold">{aspect}</h3>
                  {cards.length > 0 ? (
                    <pre className="text-xs overflow-auto max-h-40">
                      {JSON.stringify(cards, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-muted-foreground">No cards for this aspect</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center">
              <p className="text-muted-foreground">No card statistics available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AspectCardStats;