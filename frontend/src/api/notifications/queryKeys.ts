export const notificationKeys = {
  account: (sessionId?: string) => ['notifications', sessionId] as const,
  inbox: (sessionId?: string) => [...notificationKeys.account(sessionId), 'inbox'] as const,
  summary: (sessionId?: string) => [...notificationKeys.account(sessionId), 'summary'] as const,
  unread: (sessionId?: string) => [...notificationKeys.account(sessionId), 'unread'] as const,
  settings: (userId?: string) => ['notification-settings', userId] as const,
};
