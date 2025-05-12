import * as React from 'react';
import { useCardStats } from '@/api/card-stats/useCardStats.ts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useSearch } from '@tanstack/react-router';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface LeaderCardStatsProps {
  metaId?: number;
  tournamentId?: string;
  className?: string;
}

const LeaderCardStats: React.FC<LeaderCardStatsProps> = ({ metaId, tournamentId, className }) => {
  const { csLeaderId } = useSearch({ strict: false });
  const [selectedLeader, setSelectedLeader] = React.useState<string | undefined>(csLeaderId);

  // This would be fetched from an API in a real implementation
  const leaderOptions = React.useMemo(
    () => [
      { id: 'leader1', name: 'Leader 1' },
      { id: 'leader2', name: 'Leader 2' },
      { id: 'leader3', name: 'Leader 3' },
    ],
    [],
  );

  // Fetch card statistics filtered by leader
  const { data, isLoading, error } = useCardStats({
    metaId,
    tournamentId,
    leaderCardId: selectedLeader,
  });

  const handleLeaderChange = (value: string) => {
    setSelectedLeader(value);
  };

  if (isLoading) {
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

  if (error) {
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
      <Card>
        <CardHeader>
          <CardTitle>Cards by Leader</CardTitle>
          <CardDescription>
            Statistics for cards used with specific leaders in{' '}
            {metaId ? 'this meta' : 'this tournament'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="leader-select">Select Leader</Label>
              <Select value={selectedLeader} onValueChange={handleLeaderChange}>
                <SelectTrigger id="leader-select" className="w-full">
                  <SelectValue placeholder="Select a leader" />
                </SelectTrigger>
                <SelectContent>
                  {leaderOptions.map(leader => (
                    <SelectItem key={leader.id} value={leader.id}>
                      {leader.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedLeader ? (
              data?.data && data.data.length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Cards for{' '}
                    {leaderOptions.find(l => l.id === selectedLeader)?.name || selectedLeader}
                  </h3>
                  <pre className="text-xs overflow-auto max-h-96">
                    {JSON.stringify(data.data, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center">
                  <p className="text-muted-foreground">
                    No card statistics available for this leader
                  </p>
                </div>
              )
            ) : (
              <div className="h-40 flex items-center justify-center">
                <p className="text-muted-foreground">
                  Please select a leader to view card statistics
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaderCardStats;
