import type { BetterAuthPlugin } from 'better-auth';
import { createAuthEndpoint, createAuthMiddleware } from 'better-auth/api';
import { z } from 'zod';
import type { AccountRestrictionNotice } from '../../shared/types/accountRestriction.ts';
import { hasActiveAccountRestriction } from './accountRestriction.ts';

const noticeLifetime = 15 * 60;
const noticeCookie = 'restriction_notice';
const noticeSchema = z.object({ userId: z.string().min(1), expiresAt: z.number().int() });
type RestrictedUser = { banned?: boolean | null; banExpires?: Date | string | null };

/** Register before admin to set the private notice before it rejects the session. */
export const restrictionNotice = () =>
  ({
    id: 'restriction-notice',
    init() {
      return {
        options: {
          databaseHooks: {
            session: {
              create: {
                async before(session, ctx) {
                  if (!ctx || !ctx.path.startsWith('/callback/')) return;
                  // The provider identity has been verified before session creation.
                  const user = (await ctx.context.internalAdapter.findUserById(
                    session.userId,
                  )) as RestrictedUser | null;
                  const cookie = ctx.context.createAuthCookie(noticeCookie, {
                    maxAge: noticeLifetime,
                    path: '/api/auth',
                  });
                  if (hasActiveAccountRestriction(user)) {
                    await ctx.setSignedCookie(
                      cookie.name,
                      JSON.stringify({
                        userId: session.userId,
                        expiresAt: Date.now() + noticeLifetime * 1000,
                      }),
                      ctx.context.secret,
                      cookie.attributes,
                    );
                  } else {
                    ctx.setCookie(cookie.name, '', { ...cookie.attributes, maxAge: 0 });
                  }
                  // Leave session creation, expiry cleanup and rejection to Better Auth.
                },
              },
            },
          },
        },
      };
    },
    hooks: {
      before: [
        {
          // Also handle an already-open default error page or an OAuth flow
          // started by an older client without errorCallbackURL.
          matcher: ctx => ctx.path === '/error',
          handler: createAuthMiddleware(async ctx => {
            const error = new URL(ctx.request!.url).searchParams.get('error') ?? 'unknown';
            throw ctx.redirect(
              `/auth/error?${new URLSearchParams({ error: error.slice(0, 100) })}`,
            );
          }),
        },
      ],
      after: [
        {
          matcher: ctx => ctx.path === '/sign-in/social',
          handler: createAuthMiddleware(async ctx => {
            const cookie = ctx.context.createAuthCookie(noticeCookie, { path: '/api/auth' });
            ctx.setCookie(cookie.name, '', { ...cookie.attributes, maxAge: 0 });
          }),
        },
      ],
    },
    endpoints: {
      getAccountRestriction: createAuthEndpoint(
        '/account-restriction',
        { method: 'GET', requireHeaders: true },
        async ctx => {
          ctx.setHeader('Cache-Control', 'private, no-store');
          const respond = (notice: AccountRestrictionNotice) => ctx.json(notice);
          const cookie = ctx.context.createAuthCookie(noticeCookie, { path: '/api/auth' });
          const signed = await ctx.getSignedCookie(cookie.name, ctx.context.secret);
          if (!signed) return respond({ status: 'unknown' });
          let value: unknown;
          try {
            value = JSON.parse(signed);
          } catch {
            return respond({ status: 'unknown' });
          }
          const notice = noticeSchema.safeParse(value);
          if (!notice.success || notice.data.expiresAt <= Date.now()) {
            return respond({ status: 'unknown' });
          }
          const user = (await ctx.context.internalAdapter.findUserById(
            notice.data.userId,
          )) as RestrictedUser | null;
          if (!user) return respond({ status: 'unknown' });
          if (!hasActiveAccountRestriction(user)) return respond({ status: 'available' });
          if (user.banExpires) {
            return respond({
              status: 'suspended',
              expiresAt: new Date(user.banExpires).toISOString(),
            });
          }
          return respond({ status: 'banned' });
        },
      ),
    },
  }) satisfies BetterAuthPlugin;
