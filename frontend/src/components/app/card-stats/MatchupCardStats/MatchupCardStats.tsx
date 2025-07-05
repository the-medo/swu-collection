import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MatchupCardStatsProps {
  metaId?: number;
  tournamentId?: string;
  tournamentGroupId?: string;
  className?: string;
}

const MatchupCardStats: React.FC<MatchupCardStatsProps> = ({
  metaId,
  tournamentId,
  tournamentGroupId,
  className,
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      <Card>
        <CardHeader>
          <CardTitle>Matchup Statistics</CardTitle>
          <CardDescription>View statistics for card matchups</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-40 flex items-center justify-center">
            <p className="text-muted-foreground">
              Matchup statistics feature coming soon. This will show how cards perform against each other.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MatchupCardStats;