import type { User as BetterAuthUser } from 'better-auth';

export type User = Omit<
  BetterAuthUser,
  'email' | 'emailVerified' | 'updatedAt' | 'createdAt' | 'country' | 'currency'
> & {
  updatedAt: string;
  createdAt: string;
  country: string | null;
  currency: string;
};
