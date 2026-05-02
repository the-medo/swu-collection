import { Badge } from '@/components/ui/badge.tsx';

type TournamentStatus = 'upcoming' | 'running' | 'finished' | 'unknown';

const statusVariant: Record<TournamentStatus, 'secondary' | 'success' | 'outline' | 'warning'> = {
  upcoming: 'secondary',
  running: 'success',
  finished: 'outline',
  unknown: 'warning',
};

export function StatusBadge({ status }: { status: TournamentStatus }) {
  return (
    <Badge variant={statusVariant[status]} className="capitalize">
      {status}
    </Badge>
  );
}
