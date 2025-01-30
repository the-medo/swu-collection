import { useUser } from '../frontend/src/hooks/useUser.ts';

export type User = Omit<
  NonNullable<ReturnType<typeof useUser>>,
  'email' | 'emailVerified' | 'updatedAt' | 'createdAt' | 'country' | 'currency'
> & {
  updatedAt: string;
  createdAt: string;
  country: string | null;
  currency: string;
};
