// import type { User as BetterAuthUser } from 'better-auth';
import { auth } from '../server/auth/auth.ts';

export type User = Omit<
  // BetterAuthUser,
  typeof auth.$Infer.Session.user,
  'email' | 'emailVerified' | 'updatedAt' | 'createdAt' | 'country' | 'currency'
> & {
  updatedAt: string;
  createdAt: string;
  country: string | null;
  currency: string;
};
