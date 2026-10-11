import { Badge } from '@/components/ui/badge.tsx';
import { cn } from '@/lib/utils.ts';
import type { LiveTournamentWeekendTournamentEntry } from '../liveTournamentTypes.ts';
import { getStatusLabel } from '../liveTournamentUtils.ts';

export function LiveStatusBadge({
  status,
  className,
}: {
  status: LiveTournamentWeekendTournamentEntry['weekendTournament']['status'];
  className?: string;
}) {
  const variant =
    status === 'running'
      ? 'success'
      : status === 'finished'
        ? 'secondary'
        : status === 'upcoming'
          ? 'warning'
          : 'outline';

  return (
    <Badge variant={variant} className={cn('rounded-md', className)}>
      {getStatusLabel(status)}
    </Badge>
  );
}
