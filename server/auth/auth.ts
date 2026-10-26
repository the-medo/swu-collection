import { betterAuth } from 'better-auth';
import { getAuthEmailConfig } from '../lib/auth-email/config.ts';
import { enqueueAuthEmail } from '../lib/auth-email/outbox.ts';
import { authPasswordMinLength, authPasswordMaxLength } from '../../shared/auth.ts';

import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import { deleteSessionCookie } from 'better-auth/cookies';
import { hasActiveAccountRestriction } from './accountRestriction.ts';
import { restrictionNotice } from './restrictionNotice.ts';
import { assertCardAvatarUpdate } from './avatarPolicy.ts';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import { account, authSchema, user as userTable } from '../db/schema/auth-schema.ts';
import { and, eq } from 'drizzle-orm';
import { generateDisplayName } from './generateDisplayName.ts';
import { admin as adminPlugin, jwt } from 'better-auth/plugins';
import { mcp } from '@better-auth/mcp';
import { readMcpResourceUrl, MCP_AUTH_SCOPES } from '../../shared/mcp/config.ts';
import { ac, applicationRoles } from './permissions';
import { reconcilePatreonAccount } from '../lib/patreon/account.ts';
import { userCreditHooks } from './userCredits.ts';
import { validateDisplayName } from './displayNamePolicy.ts';

const emailConfig = getAuthEmailConfig();

export type AuthExtension = {
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
};

// Opt in explicitly. Existing installations can migrate before enabling MCP.
export const mcpResourceUrl = process.env.MCP_RESOURCE_URL
  ? readMcpResourceUrl(process.env.MCP_RESOURCE_URL)
  : undefined;

export const auth = betterAuth({
  // Session checks run on every request; avoid emitting internal auth spans for each one.
  experimental: { instrumentation: { enabled: false } },
  onAPIError: { errorURL: '/auth/error' },
  databaseHooks: {
    user: {
      create: {
        before: validateDisplayName,
        after: async (user, ctx) => {
          // Password registrations receive credits only after mailbox ownership
          // is verified. Existing OAuth registration/session behavior is preserved.
          if (ctx?.path !== '/sign-up/email') await userCreditHooks.created(user);
        },
      },
      update: { before: validateDisplayName, after: reconcilePatreonAccount },
    },
    session: {
      create: { after: userCreditHooks.sessionChanged },
      update: { after: userCreditHooks.sessionChanged },
    },
  },
  hooks: {
    before: createAuthMiddleware(async ctx => {
      assertCardAvatarUpdate(ctx.path, ctx.body);
      const emailRedirect =
        ctx.path === '/request-password-reset'
          ? { field: 'redirectTo', path: '/auth/reset-password' }
          : ['/sign-up/email', '/send-verification-email'].includes(ctx.path)
            ? { field: 'callbackURL', path: '/auth/verify', query: '?verified=true' }
            : null;
      if (emailConfig.enabled && emailRedirect && ctx.body) {
        const value = ctx.body[emailRedirect.field];
        let redirect: URL;
        try {
          redirect = new URL(
            value ?? emailRedirect.path + (emailRedirect.query ?? ''),
            emailConfig.origin,
          );
        } catch {
          throw new APIError('BAD_REQUEST', { message: 'Invalid email callback.' });
        }
        if (redirect.origin !== emailConfig.origin || redirect.pathname !== emailRedirect.path) {
          throw new APIError('FORBIDDEN', { message: 'Invalid email callback.' });
        }
        ctx.body[emailRedirect.field] = redirect.href;
      }
      if (ctx.path === '/sign-up/email' && ctx.body) {
        // Password signup cannot bypass the app's avatar selection policy.
        delete ctx.body.image;
        if (
          typeof ctx.body.name === 'string' &&
          (!ctx.body.name.trim() || ctx.body.name.length > 80)
        ) {
          throw new APIError('BAD_REQUEST', { message: 'Enter a name, up to 80 characters.' });
        }
      }
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
    ...(mcpResourceUrl
      ? [
          // OAuth needs signing keys, not an extra JWT on every browser session
          // response. This also preserves the restriction hook's null session.
          jwt({ disableSettingJwtHeader: true }),
          mcp({
            resource: mcpResourceUrl,
            loginPage: '/mcp/login',
            consentPage: '/mcp/consent',
            scopes: [...MCP_AUTH_SCOPES],
            grantTypes: ['authorization_code', 'refresh_token'],
            accessTokenExpiresIn: 300,
            allowDynamicClientRegistration: true,
            allowUnauthenticatedClientRegistration: true,
            clientRegistrationRequirePKCE: true,
          }),
        ]
      : []),
  ],
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      ...authSchema,
    },
  }),
  emailAndPassword: {
    enabled: emailConfig.enabled,
    requireEmailVerification: true,
    autoSignIn: false,
    minPasswordLength: authPasswordMinLength,
    maxPasswordLength: authPasswordMaxLength,
    resetPasswordTokenExpiresIn: 3600,
    revokeSessionsOnPasswordReset: true,
    ...(emailConfig.enabled
      ? {
          sendResetPassword: async ({
            user,
            url,
          }: {
            user: { email: string; emailVerified: boolean };
            url: string;
          }) => {
            await enqueueAuthEmail({
              to: user.email,
              url,
              kind: user.emailVerified ? 'password-reset' : 'verification',
            });
          },
          onPasswordReset: async ({
            user,
          }: {
            user: { id: string; emailVerified: boolean };
          }): Promise<void> => {
            // A single-use email token proves mailbox ownership AND replaces any
            // password chosen before that ownership was established.
            if (!user.emailVerified) {
              await db
                .update(userTable)
                .set({ emailVerified: true, updatedAt: new Date() })
                .where(eq(userTable.id, user.id));
              await userCreditHooks.created(user);
            }
          },
          onExistingUserSignUp: async ({
            user,
          }: {
            user: { email: string; emailVerified: boolean };
          }): Promise<void> => {
            if (!user.emailVerified) {
              await auth.api.requestPasswordReset({
                body: {
                  email: user.email,
                  redirectTo: `${emailConfig.origin}/auth/reset-password`,
                },
              });
            } else {
              await enqueueAuthEmail({
                to: user.email,
                url: `${emailConfig.origin}/auth/sign-in`,
                kind: 'existing-account',
              });
            }
          },
        }
      : {}),
  },
  emailVerification: emailConfig.enabled
    ? {
        sendOnSignUp: true,
        sendOnSignIn: false,
        autoSignInAfterVerification: false,
        expiresIn: 3600,
        sendVerificationEmail: async ({ user }: { user: { email: string } }): Promise<void> => {
          // Never send a bare verification JWT for a pending password account.
          // The mailbox owner chooses their password using this single-use link.
          await auth.api.requestPasswordReset({
            body: { email: user.email, redirectTo: `${emailConfig.origin}/auth/reset-password` },
          });
        },
        beforeEmailVerification: async user => {
          // Defense in depth for any previously issued bare verification token.
          // It must not activate a password someone else chose for this address.
          if (!user.emailVerified)
            await db
              .delete(account)
              .where(and(eq(account.userId, user.id), eq(account.providerId, 'credential')));
        },
        afterEmailVerification: userCreditHooks.created,
      }
    : undefined,
  // Better Auth's production limits include stricter sign-in/signup/reset rules.
  // The durable email queue additionally enforces recipient-level cooldowns.
  rateLimit: {
    enabled:
      process.env.NODE_ENV === 'production' || process.env.AUTH_RATE_LIMIT_ENABLED === 'true',
  },
  logger: {
    log(level) {
      if (level === 'error' || level === 'warn')
        console.warn('[auth] Authentication operation reported a warning or error.');
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google', 'github'],
      // Verify the local email first; never link an attacker-created pending
      // password account just because its email matches a later Google login.
      requireLocalEmailVerified: true,
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
