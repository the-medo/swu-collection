import { useUser } from '../frontend/src/hooks/useUser.ts';

export type User = Omit<ReturnType<typeof useUser>, 'email' | 'emailVerified'>;
