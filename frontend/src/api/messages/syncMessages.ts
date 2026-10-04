import type { QueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { authClient } from '@/lib/auth-client.ts';
import { createApiError } from '@/api/errors.ts';
import { MessageSync } from './messageSync.ts';
import { refreshMessages } from './refreshMessages.ts';

const controllers = new WeakMap<QueryClient, Map<string, MessageSync>>();

export function getMessageSync(client: QueryClient, sessionId: string) {
  let sessions = controllers.get(client);
  if (!sessions) controllers.set(client, (sessions = new Map()));
  let controller = sessions.get(sessionId);
  if (!controller) {
    controller = new MessageSync(client, sessionId, {
      current: () => authClient.$store.atoms.session.get().data?.session.id === sessionId,
      refresh: () => refreshMessages(client, sessionId),
      fetchUpdate: async (peerId, after, signal) => {
        const response = await api.messages.with[':userId'].updates.$get(
          {
            param: { userId: peerId },
            query: after === undefined ? {} : { after: String(after) },
          },
          { init: { signal } },
        );
        if (!response.ok) throw await createApiError(response, 'Could not update messages.');
        return response.json();
      },
    });
    sessions.set(sessionId, controller);
  }
  return controller;
}

export function stopMessageSync(client: QueryClient, sessionId: string) {
  const sessions = controllers.get(client);
  sessions?.get(sessionId)?.stop();
  sessions?.delete(sessionId);
}
