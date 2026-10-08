export const walletKeys = {
  root: ['user-wallet'] as const,
  all: (userId: string) => ['user-wallet', userId] as const,
  balance: (userId: string) => [...walletKeys.all(userId), 'balance'] as const,
  transactions: (userId: string, page: number) =>
    [...walletKeys.all(userId), 'transactions', page] as const,
  shop: (userId?: string) => ['shop', userId] as const,
  shops: ['shop'] as const,
};
