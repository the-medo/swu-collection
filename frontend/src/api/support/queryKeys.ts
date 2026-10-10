export const supportKeys = {
  all: ['support'] as const,
  overview: (userId?: string) => ['support', userId, 'overview'] as const,
  receipt: (userId: string | undefined, requestId: string | undefined) =>
    ['support', userId, 'receipt', requestId] as const,
};
