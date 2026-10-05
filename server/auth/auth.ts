import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import { deleteSessionCookie } from 'better-auth/cookies';
import { hasActiveAccountRestriction } from './accountRestriction.ts';
import { restrictionNotice } from './restrictionNotice.ts';
import { assertCardAvatarUpdate } from './avatarPolicy.ts';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import { authSchema } from '../db/schema/auth-schema.ts';
import { generateDisplayName } from './generateDisplayName.ts';
import { admin as adminPlugin } from 'better-auth/plugins';
import { ac, applicationRoles } from './permissions';
import { reconcilePatreonAccount } from '../lib/patreon/account.ts';

export type AuthExtension = {
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
};

export const auth = betterAuth({
  onAPIError: { errorURL: '/auth/error' },
  databaseHooks: {
    user: {
      create: { after: reconcilePatreonAccount },
      update: { after: reconcilePatreonAccount },
    },
  },
  hooks: {
    before: createAuthMiddleware(async ctx => {
      assertCardAvatarUpdate(ctx.path, ctx.body);
      // Protect auth mutations as well as app routes from a session created by
      // an OAuth callback that overlapped a restriction transaction.
      if (ctx.path !== '/get-session' && ctx.path !== '/account-restriction') {
        const current = await getSessionFromCtx(ctx, { disableCookieCache: true });
        if (
          hasActiveAccountRestriction({
            banned: current?.user.banned,
            banExpires: current?.user.banExpires,
          })
        ) {
          await ctx.context.internalAdapter.deleteUserSessions(current!.user.id);
          deleteSessionCookie(ctx);
          throw new APIError('FORBIDDEN', {
            code: 'BANNED_USER',
            message: 'This account is suspended or banned.',
          });
        }
      }
    }),
    after: createAuthMiddleware(async ctx => {
      if (ctx.path !== '/get-session') return;
      const current = ctx.context.returned as {
        user?: { id: string; banned?: boolean | null; banExpires?: Date | string | null };
      } | null;
      if (current?.user && hasActiveAccountRestriction(current.user)) {
        await ctx.context.internalAdapter.deleteUserSessions(current.user.id);
        deleteSessionCookie(ctx);
        ctx.context.session = null;
        throw new APIError('UNAUTHORIZED', {
          code: 'BANNED_USER',
          message: 'This account is suspended or banned.',
        });
      }
    }),
  },
  advanced: process.env.BETTER_AUTH_COOKIE_PREFIX
    ? {
        // Cookies are scoped to a host rather than a port. Worktree setup gives
        // every localhost instance its own prefix so their sessions cannot mix.
        cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX,
      }
    : undefined,
  plugins: [
    restrictionNotice(),
    adminPlugin({
      ac,
      roles: applicationRoles,
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
      calendarPrivacy: {
        type: 'string',
        required: false,
        input: false,
        returned: false,
        defaultValue: 'unlisted',
      },
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
