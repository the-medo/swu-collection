import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import { authSchema } from '../db/schema/auth-schema.ts';
import { generateDisplayName } from './generateDisplayName.ts';
import { admin as adminPlugin } from 'better-auth/plugins';
import { ac, admin, moderator, organizer } from './permissions';

export type AuthExtension = {
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
};

export const auth = betterAuth({
  advanced: process.env.BETTER_AUTH_COOKIE_PREFIX
    ? {
        // Cookies are scoped to a host rather than a port. Worktree setup gives
        // every localhost instance its own prefix so their sessions cannot mix.
        cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX,
      }
    : undefined,
  plugins: [
    adminPlugin({
      ac,
      roles: {
        admin,
        moderator,
        organizer,
      },
    }),
  ],
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      ...authSchema,
    },
  }),
  emailAndPassword: {
    enabled: false,
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google', 'github'],
    },
  },
  user: {
    additionalFields: {
      displayName: {
        type: 'string',
        required: true,
        returned: true,
        unique: true,
        defaultValue: () => generateDisplayName(),
      },
      country: {
        type: 'string',
        required: false,
        returned: true,
      },
      state: {
        type: 'string',
        required: false,
        returned: true,
      },
      currency: {
        type: 'string',
        required: true,
        returned: true,
        defaultValue: 'USD',
        /*validator: {
          input: ;
        }*/
      },
    },
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL!],
});
