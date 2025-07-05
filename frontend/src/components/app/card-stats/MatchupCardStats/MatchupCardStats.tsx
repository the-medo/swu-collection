import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import LeaderBaseStatSelector from '../LeaderBaseStatSelector';
import { useSearch } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';

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
  const { csLeaderId, csBaseId, csLeaderId2, csBaseId2 } = useSearch({ strict: false });

  const deck1ready = csLeaderId !== undefined || csBaseId !== undefined;
  const deck2ready = csLeaderId2 !== undefined || csBaseId2 !== undefined;

  return (
    <div className={cn('flex flex-col gap-4 items-center', className)}>
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
      <Button disabled={!deck1ready || !deck2ready}>Compute statistics</Button>
    </div>
  );
};

export default MatchupCardStats;
