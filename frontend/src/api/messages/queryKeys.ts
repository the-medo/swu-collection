export const messageKeys = {
  account: (sessionId?: string) => ['messages', sessionId] as const,
  summary: (sessionId?: string) => [...messageKeys.account(sessionId), 'summary'] as const,
  conversations: (sessionId?: string) =>
    [...messageKeys.account(sessionId), 'conversations'] as const,
  history: (sessionId: string | undefined, peerId: string) =>
    [...messageKeys.account(sessionId), 'history', peerId] as const,
};
