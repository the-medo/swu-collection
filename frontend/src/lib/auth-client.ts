import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL!,
});

export const { signIn, signOut, signUp, useSession } = authClient;
