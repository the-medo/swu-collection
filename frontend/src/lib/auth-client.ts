import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import { auth } from '../../../server/auth/auth.ts';

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL!,
  plugins: [inferAdditionalFields<typeof auth>()],
});

export const { signIn, signOut, signUp, useSession } = authClient;
