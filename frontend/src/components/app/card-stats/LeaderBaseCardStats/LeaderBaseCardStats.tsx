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
  const { csLeaderAndBaseId } = useSearch({ strict: false });
  const [selectedLeaderBase, setSelectedLeaderBase] = React.useState<string | undefined>(
    csLeaderAndBaseId,
  );

  // Parse the leader and base IDs from the combined string
  const [selectedLeaderId, selectedBaseId] = React.useMemo(() => {
    if (!selectedLeaderBase) return [undefined, undefined];
    const [leaderId, baseId] = selectedLeaderBase.split('|');
    return [leaderId, baseId];
  }, [selectedLeaderBase]);

  // This would be fetched from an API in a real implementation
  const leaderBaseOptions = React.useMemo(
    () => [
      { id: 'leader1|base1', leaderName: 'Leader 1', baseName: 'Base 1' },
      { id: 'leader1|base2', leaderName: 'Leader 1', baseName: 'Base 2' },
      { id: 'leader2|base1', leaderName: 'Leader 2', baseName: 'Base 1' },
      { id: 'leader2|base3', leaderName: 'Leader 2', baseName: 'Base 3' },
      { id: 'leader3|base2', leaderName: 'Leader 3', baseName: 'Base 2' },
    ],
    [],
  );

  // Fetch card statistics filtered by leader and base
  const { data, isLoading, error } = useCardStats({
    metaId,
    tournamentId,
    leaderCardId: selectedLeaderId,
    baseCardId: selectedBaseId,
  });

  const handleLeaderBaseChange = (value: string) => {
    setSelectedLeaderBase(value);
  };

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
      <Card>
        <CardHeader>
          <CardTitle>Cards by Leader/Base</CardTitle>
          <CardDescription>
            Statistics for cards used with specific leader and base combinations in{' '}
            {metaId ? 'this meta' : 'this tournament'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="leader-base-select">Select Leader/Base Combination</Label>
              <Select value={selectedLeaderBase} onValueChange={handleLeaderBaseChange}>
                <SelectTrigger id="leader-base-select" className="w-full">
                  <SelectValue placeholder="Select a leader/base combination" />
                </SelectTrigger>
                <SelectContent>
                  {leaderBaseOptions.map(option => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.leaderName} / {option.baseName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedLeaderBase ? (
              data?.data && data.data.length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Cards for{' '}
                    {leaderBaseOptions.find(o => o.id === selectedLeaderBase)?.leaderName ||
                      selectedLeaderId}{' '}
                    /
                    {leaderBaseOptions.find(o => o.id === selectedLeaderBase)?.baseName ||
                      selectedBaseId}
                  </h3>
                  <pre className="text-xs overflow-auto max-h-96">
                    {JSON.stringify(data.data, null, 2)}
                  </pre>
                </div>
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
                  Please select a leader/base combination to view card statistics
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaderBaseCardStats;
