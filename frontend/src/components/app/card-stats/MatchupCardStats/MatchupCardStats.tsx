import * as React from 'react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import LeaderBaseStatSelector from '../LeaderBaseStatSelector';
import { useSearch } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
import { useMatchupCardStats } from '@/api/card-stats';
import { toast } from '@/hooks/use-toast.ts';
import CardMatchupViewSelector, { CardMatchupView } from './CardMatchupViewSelector';
import MatchupCardStatsTable from './MatchupCardStatsTable';

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
  const {
    csLeaderId,
    csBaseId,
    csLeaderId2,
    csBaseId2,
    csCardMatchupView = '1',
  } = useSearch({ strict: false });
  const matchupCardStatsMutation = useMatchupCardStats();
  const [statsData, setStatsData] = useState<any>(null);

  const deck1ready = csLeaderId !== undefined || csBaseId !== undefined;
  const deck2ready = csLeaderId2 !== undefined || csBaseId2 !== undefined;

  const handleComputeStats = async () => {
    try {
      const result = await matchupCardStatsMutation.mutateAsync({
        metaId,
        tournamentId,
        tournamentGroupId,
        leaderId: csLeaderId,
        baseId: csBaseId,
        leaderId2: csLeaderId2,
        baseId2: csBaseId2,
      });

      toast({
        title: 'Success',
        description: 'Matchup statistics computed successfully',
      });

      setStatsData(result.data);
      console.log('Matchup stats result:', result);
    } catch (error) {
      console.error('Error computing matchup stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to compute matchup statistics',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-col md:flex-row items-center gap-8 justify-center">
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-medium mb-4">Deck 1</h3>
          <LeaderBaseStatSelector type="main" size="w200" />
          <p className="text-muted-foreground">{!deck1ready && 'Select a leader or a base'}</p>
        </div>
        <h3>vs.</h3>
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-medium mb-4">Opposing Deck</h3>
          <LeaderBaseStatSelector type="secondary" size="w200" />
          <p className="text-muted-foreground">{!deck2ready && 'Select a leader or a base'}</p>
        </div>
      </div>

      <div className="flex justify-center mt-4">
        <Button
          disabled={!deck1ready || !deck2ready || matchupCardStatsMutation.isPending}
          onClick={handleComputeStats}
        >
          {matchupCardStatsMutation.isPending ? 'Computing...' : 'Compute statistics'}
        </Button>
      </div>

      {statsData && (
        <div className="mt-8 space-y-4">
          <CardMatchupViewSelector />

          <div className="w-full">
            <MatchupCardStatsTable
              data={statsData}
              selectedView={csCardMatchupView as CardMatchupView}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchupCardStats;
