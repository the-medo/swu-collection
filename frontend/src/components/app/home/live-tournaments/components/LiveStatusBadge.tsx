import { Badge } from '@/components/ui/badge.tsx';
import type { LiveTournamentWeekendTournamentEntry } from '../liveTournamentTypes.ts';
import { getStatusLabel } from '../liveTournamentUtils.ts';

export function LiveStatusBadge({
  status,
}: {
  status: LiveTournamentWeekendTournamentEntry['weekendTournament']['status'];
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
    <Badge variant={variant} className="rounded-md">
      {getStatusLabel(status)}
    </Badge>
  );
}
