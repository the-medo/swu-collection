import { Badge } from '@/components/ui/badge';

export function CrossfireWorkerStatus({
  online,
  unavailable,
}: {
  online: boolean | undefined;
  unavailable: boolean;
}) {
  if (unavailable) return <Badge variant="warning">Telemetry unavailable</Badge>;
  if (online === undefined) return null;
  return (
    <Badge variant={online ? 'success' : 'destructive'}>
      {online ? 'Worker online' : 'Worker offline'}
    </Badge>
  );
}
