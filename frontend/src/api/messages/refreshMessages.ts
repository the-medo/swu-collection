import type { QueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client.ts';
import { messageKeys } from './queryKeys.ts';

export async function refreshMessages(client: QueryClient, sessionId?: string) {
  const current = () =>
    !!sessionId && authClient.$store.atoms.session.get().data?.session.id === sessionId;
  if (!current()) return;
  await Promise.all(
    client
      .getQueryCache()
      .findAll({ queryKey: messageKeys.account(sessionId) })
      .map(async query => {
        // Let an explicit pagination click finish before refreshing the loaded pages.
        // Otherwise a live update can silently discard the reader's older-page request.
        if (query.state.fetchMeta?.fetchMore && query.state.fetchStatus === 'fetching') {
          await query.promise?.catch(() => undefined);
        }
        if (!current()) return;
        const filter = { queryKey: query.queryKey, exact: true };
        // A first fetch may have read before the event committed; invalidation alone
        // can reuse that stale in-flight request, so cancel it before refetching.
        await client.cancelQueries(filter);
        if (current()) await client.invalidateQueries(filter);
      }),
  );
}
