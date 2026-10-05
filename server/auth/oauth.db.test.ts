import { expect, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { auth } from './auth.ts';
import { db } from '../db';
import { account, session, user } from '../db/schema/auth-schema.ts';

const enabled = process.env.SWUBASE_USER_REPORTS_DB_TEST === '1';
if (enabled) {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
    throw new Error('OAuth tests require an isolated worktree database.');
}

for (const providerId of ['google', 'github'] as const) {
  for (const existing of [true, false]) {
    test.skipIf(!enabled)(
      `${providerId} signs in an ${existing ? 'existing' : 'unregistered'} account, preserves permissions and supports logout`,
      async () => {
        const id = `oauth-upgrade-test-${crypto.randomUUID()}`;
        const email = `${id}@invalid.local`;
        const subject =
          providerId === 'google' ? id : crypto.getRandomValues(new Uint32Array(1))[0]!;
        const origin = process.env.BETTER_AUTH_URL!;
        const ctx = await auth.$context;
        const provider = ctx.socialProviders.find(p => p.id === providerId)!;
        const originalValidate = provider.validateAuthorizationCode;
        const originalUserInfo = provider.getUserInfo;
        // Keep state, account resolution, user defaults, permissions and cookies
        // real. Only the external provider exchange is replaced with fixtures.
        provider.validateAuthorizationCode = async () => ({ accessToken: 'fixture-only' });
        provider.getUserInfo = async () => ({
          user: { email, emailVerified: true, name: 'OAuth fixture' },
          data: providerId === 'google' ? { sub: subject } : { id: subject },
        });
        try {
          if (existing) {
            await db.insert(user).values({
              id,
              name: id,
              displayName: id,
              email,
              emailVerified: true,
              currency: 'GBP',
              role: 'user',
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            await db.insert(account).values({
              id: crypto.randomUUID(),
              userId: id,
              accountId: String(subject),
              providerId,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
          const start = await auth.handler(
            new Request(origin + '/api/auth/sign-in/social', {
              method: 'POST',
              headers: { Origin: origin, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                provider: providerId,
                callbackURL: '/',
                errorCallbackURL: '/auth/error',
                disableRedirect: true,
              }),
            }),
          );
          expect(start.status).toBe(200);
          const authorization = new URL((await start.json()).url);
          expect(authorization.hostname).toBe(
            providerId === 'google' ? 'accounts.google.com' : 'github.com',
          );
          expect(authorization.searchParams.get('redirect_uri')).toBe(
            `${origin}/api/auth/callback/${providerId}`,
          );
          const state = authorization.searchParams.get('state')!;
          const callback = await auth.handler(
            new Request(
              `${origin}/api/auth/callback/${providerId}?code=fixture&state=${encodeURIComponent(state)}`,
              {
                headers: {
                  Cookie: start.headers
                    .getSetCookie()
                    .map(c => c.split(';')[0])
                    .join('; '),
                },
              },
            ),
          );
          expect(callback.status).toBe(302);
          expect(callback.headers.get('location')).toBe('/');
          const headers = new Headers({
            Cookie: callback.headers
              .getSetCookie()
              .map(c => c.split(';')[0])
              .join('; '),
            Origin: origin,
            'Content-Type': 'application/json',
          });
          const current = await auth.api.getSession({ headers });
          expect(current?.user.email).toBe(email);
          expect(current?.user.role).toBe('user');
          expect(current?.user.displayName).toBeTruthy();
          if (existing) {
            expect(current?.user.id).toBe(id);
            expect(current?.user.displayName).toBe(id);
            expect(current?.user.currency).toBe('GBP');
          } else {
            expect(current?.user.currency).toBe('USD');
          }
          const userId = current!.user.id;
          expect(await db.select().from(user).where(eq(user.email, email))).toHaveLength(1);
          expect(
            await db
              .select()
              .from(account)
              .where(
                and(eq(account.providerId, providerId), eq(account.accountId, String(subject))),
              ),
          ).toHaveLength(1);
          const forbidden = await auth.handler(
            new Request(origin + '/api/auth/admin/set-role', {
              method: 'POST',
              headers,
              body: JSON.stringify({ userId, role: 'admin' }),
            }),
          );
          expect(forbidden.status).toBe(403);
          const update = await auth.handler(
            new Request(origin + '/api/auth/update-user', {
              method: 'POST',
              headers,
              body: JSON.stringify({ displayName: id + '-updated' }),
            }),
          );
          expect(update.status).toBe(200);
          expect((await auth.api.getSession({ headers }))?.user.displayName).toBe(id + '-updated');
          const logout = await auth.handler(
            new Request(origin + '/api/auth/sign-out', { method: 'POST', headers, body: '{}' }),
          );
          expect(logout.status).toBe(200);
          expect(await auth.api.getSession({ headers })).toBeNull();
          expect(await db.select().from(session).where(eq(session.userId, userId))).toHaveLength(0);
        } finally {
          provider.validateAuthorizationCode = originalValidate;
          provider.getUserInfo = originalUserInfo;
          await db.delete(user).where(eq(user.email, email));
        }
      },
    );
  }
}
