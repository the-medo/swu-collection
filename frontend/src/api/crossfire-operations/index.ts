import { useQuery } from '@tanstack/react-query';
import { useRole } from '@/hooks/useRole.ts';
import { useSession } from '@/lib/auth-client.ts';
import type { CrossfireOperationsHours } from '../../../../shared/types/crossfire-operations.ts';
import { crossfireOperationsQueryOptions } from './queryOptions.ts';

export function useCrossfireOperations(hours: CrossfireOperationsHours) {
  const { data: session } = useSession();
  const isAdmin = useRole()('admin');
  return useQuery({
    ...crossfireOperationsQueryOptions(session?.session.id, hours),
    enabled: !!session && isAdmin,
  });
}
