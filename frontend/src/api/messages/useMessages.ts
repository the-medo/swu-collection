import {
  skipToken,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { authClient, useSession } from '@/lib/auth-client.ts';
import { createApiError } from '@/api/errors.ts';
import { messageKeys } from './queryKeys.ts';
import { getMessageSync } from './syncMessages.ts';
import type {
  ConversationCursor,
  ConversationPage,
  MessagePage,
  MessageChange,
} from '../../../../shared/types/messages.ts';

export function useMessageSummary() {
  const sessionId = useSession().data?.session.id;
  return useQuery({
    queryKey: messageKeys.summary(sessionId),
    queryFn: sessionId
      ? async ({ signal }) => {
          const response = await api.messages.summary.$get({}, { init: { signal } });
          if (!response.ok) throw await createApiError(response, 'Could not load unread messages.');
          return response.json();
        }
      : skipToken,
    staleTime: 30_000,
    gcTime: 0,
    retry: false,
  });
}
export function useConversations() {
  const sessionId = useSession().data?.session.id;
  return useInfiniteQuery({
    queryKey: messageKeys.conversations(sessionId),
    initialPageParam: null as ConversationCursor | null,
    queryFn: sessionId
      ? async ({ pageParam, signal }): Promise<ConversationPage> => {
          const response = await api.messages.conversations.$get(
            { query: pageParam ? { cursor: JSON.stringify(pageParam) } : {} },
            { init: { signal } },
          );
          if (!response.ok) throw await createApiError(response, 'Could not load conversations.');
          return response.json();
        }
      : skipToken,
    getNextPageParam: page => page.nextCursor,
    staleTime: 30_000,
    gcTime: 0,
    retry: false,
  });
}
export function useMessageHistory(peerId: string) {
  const sessionId = useSession().data?.session.id;
  return useInfiniteQuery({
    queryKey: messageKeys.history(sessionId, peerId),
    initialPageParam: null as number | null,
    queryFn: sessionId
      ? async ({ pageParam, signal }): Promise<MessagePage> => {
          const response = await api.messages.with[':userId'].$get(
            { param: { userId: peerId }, query: pageParam ? { before: String(pageParam) } : {} },
            { init: { signal } },
          );
          if (!response.ok)
            throw await createApiError(response, 'Could not load this conversation.');
          return response.json();
        }
      : skipToken,
    getNextPageParam: page => page.nextBefore,
    staleTime: 30_000,
    gcTime: 0,
    retry: false,
  });
}
function requireSession(sessionId?: string) {
  if (!sessionId || authClient.$store.atoms.session.get().data?.session.id !== sessionId)
    throw new Error('Your account changed. Please try again.');
}
function useRefreshMessages() {
  const sessionId = useSession().data?.session.id;
  const client = useQueryClient();
  return {
    sessionId,
    refresh: (change?: MessageChange) => {
      if (!sessionId || authClient.$store.atoms.session.get().data?.session.id !== sessionId)
        return Promise.resolve();
      const sync = getMessageSync(client, sessionId);
      return change ? sync.changed(change) : sync.resync();
    },
  };
}
export function useSendMessage() {
  const { sessionId, refresh } = useRefreshMessages();
  return useMutation({
    gcTime: 0,
    retry: false,
    mutationFn: async (input: { peerId: string; body: string; clientMessageId: string }) => {
      requireSession(sessionId);
      const response = await api.messages.with[':userId'].$post({
        param: { userId: input.peerId },
        json: { body: input.body, clientMessageId: input.clientMessageId },
      });
      if (!response.ok)
        throw await createApiError(
          response,
          'Could not send your message. Your draft is still here.',
        );
      return response.json();
    },
    onSuccess: data => {
      void refresh(data.change);
    },
  });
}
export function useReadMessages() {
  const { sessionId, refresh } = useRefreshMessages();
  return useMutation({
    gcTime: 0,
    retry: false,
    mutationFn: async (input: { conversationId: string; throughSequence: number }) => {
      requireSession(sessionId);
      const response = await api.messages.conversations[':id'].read.$post({
        param: { id: input.conversationId },
        json: { throughSequence: input.throughSequence },
      });
      if (!response.ok) throw await createApiError(response, 'Could not mark messages as read.');
      return response.json();
    },
    onSuccess: data => refresh(data.change),
  });
}
