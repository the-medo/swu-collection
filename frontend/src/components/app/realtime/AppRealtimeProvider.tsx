import { useEffect, useMemo, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth-client.ts';
import { AppRealtimeConnection } from '@/lib/appRealtime.ts';
import { messageKeys } from '@/api/messages/queryKeys.ts';
import { getMessageSync, stopMessageSync } from '@/api/messages/syncMessages.ts';
import { messageChangeSchema } from '../../../../../shared/types/messages.ts';
import { notificationKeys } from '@/api/notifications/queryKeys.ts';

import { AppRealtimeContext } from './context.ts';

export function AppRealtimeProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  const sessionId = session.data?.session.id;
  const userId = session.data?.user.id;
  const client = useQueryClient();
  const refetch = session.refetch;
  const connection = useMemo(() => {
    if (!sessionId) return null;
    // Vite proxies /api WebSockets to the worktree backend, just like HTTP.
    const url = new URL('/api/ws/events', window.location.origin);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return new AppRealtimeConnection(url.toString(), () => {
      void refetch();
    });
  }, [sessionId, refetch]);

  useEffect(() => {
    if (!connection || !sessionId) return;
    const messages = getMessageSync(client, sessionId);
    const refresh = async (queryKey: readonly unknown[]) => {
      // An initial HTTP request may have read before the event was committed.
      // Cancel it explicitly: invalidating a first fetch alone can reuse it.
      await client.cancelQueries({ queryKey });
      await client.invalidateQueries({ queryKey });
    };
    const unlisten = connection.listen(event => {
      const resync = event.type === 'app.connected' || event.type === 'app.resync';
      if (resync || event.type === 'notifications.changed' || event.type === 'crossfire.invitation')
        void refresh(notificationKeys.account(sessionId));
      if (resync) void messages.resync();
      else if (event.type === 'messages.changed') {
        const change = messageChangeSchema.safeParse(event.change);
        if (change.success) void messages.changed(change.data);
        else void messages.resync();
      }
      if (resync || event.type === 'user.settings.changed')
        void refresh(notificationKeys.settings(userId));
    });
    connection.start();
    window.addEventListener('focus', connection.focus);
    return () => {
      connection.stop();
      stopMessageSync(client, sessionId);
      unlisten();
      window.removeEventListener('focus', connection.focus);
      void client.cancelQueries({ queryKey: messageKeys.account(sessionId) });
      client.removeQueries({ queryKey: messageKeys.account(sessionId) });
      void client.cancelQueries({ queryKey: notificationKeys.account(sessionId) });
      client.removeQueries({ queryKey: notificationKeys.account(sessionId) });
      void client.cancelQueries({ queryKey: notificationKeys.settings(userId) });
      client.removeQueries({ queryKey: notificationKeys.settings(userId) });
    };
  }, [connection, client, sessionId, userId]);
  return <AppRealtimeContext.Provider value={connection}>{children}</AppRealtimeContext.Provider>;
}
