import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useUpdateTournamentWeekend } from '@/api/tournament-weekends';
import { Button } from '@/components/ui/button.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import { TableCell, TableRow } from '@/components/ui/table.tsx';
import { toast } from '@/hooks/use-toast.ts';
import { CountBadge } from './CountBadge.tsx';
import { TournamentWeekendDetailPanel } from './TournamentWeekendDetailPanel.tsx';
import { formatDate, formatDateTime } from './utils.ts';
import type { TournamentWeekend } from '../../../../../../server/db/schema/tournament_weekend.ts';

export function TournamentWeekendRow({ weekend }: { weekend: TournamentWeekend }) {
  const [expanded, setExpanded] = useState(false);
  const updateWeekend = useUpdateTournamentWeekend();

  const toggleLive = async (isLive: boolean) => {
    try {
      await updateWeekend.mutateAsync({
        id: weekend.id,
        data: { isLive },
      });
      toast({
        title: isLive ? 'Weekend is live' : 'Weekend is no longer live',
        description: isLive
          ? `"${weekend.name}" is now the live tournament weekend.`
          : `"${weekend.name}" was removed from live mode.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to update live weekend',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <TableRow>
        <TableCell>
          <Button variant="ghost" size="icon" onClick={() => setExpanded(value => !value)}>
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </TableCell>
        <TableCell>
          <div className="font-medium">{weekend.name}</div>
          <div className="text-xs text-muted-foreground">
            Updated {formatDateTime(weekend.updatedAt)}
          </div>
        </TableCell>
        <TableCell>{formatDate(weekend.date)}</TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-1">
            <CountBadge label="Upcoming" value={weekend.tournamentsUpcoming} />
            <CountBadge label="Running" value={weekend.tournamentsRunning} />
            <CountBadge label="Finished" value={weekend.tournamentsFinished} />
            <CountBadge label="Unknown" value={weekend.tournamentsUnknown} />
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Switch
              checked={weekend.isLive}
              disabled={updateWeekend.isPending}
              onCheckedChange={toggleLive}
            />
            <span className="text-sm">{weekend.isLive ? 'Live' : 'Off'}</span>
          </div>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={5} className="bg-muted/20 p-4">
            <TournamentWeekendDetailPanel weekend={weekend} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
