import { expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { serializeSignedCookie } from 'better-call';
import { auth } from './auth.ts';
import { db } from '../db';
import { account, session, user } from '../db/schema/auth-schema.ts';

const enabled = process.env.SWUBASE_USER_REPORTS_DB_TEST === '1';
if (enabled) {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
    throw new Error('Auth notice tests require an isolated worktree database.');
}

test.skipIf(!enabled)(
  'native OAuth rejection carries a private notice; expiry and restoration allow sign-in',
  async () => {
    const id = `auth-notice-test-${crypto.randomUUID()}`;
    const origin = process.env.BETTER_AUTH_URL!;
    const expires = new Date(Date.now() + 180000);
    const ctx = await auth.$context;
    const provider = ctx.socialProviders.find(p => p.id === 'google')!;
    const originalValidate = provider.validateAuthorizationCode;
    const originalUserInfo = provider.getUserInfo;
    // Only the external identity provider is stubbed. Better Auth's state,
    // callback, database hooks, admin plugin and signed cookies are real.
    provider.validateAuthorizationCode = async () => ({ accessToken: 'fixture-only' });
    provider.getUserInfo = async () => ({
      user: { id, email: `${id}@invalid.local`, emailVerified: true, name: id },
      data: {},
    });
    const request = (path: string, cookie = '') =>
      auth.handler(new Request(origin + '/api/auth' + path, { headers: { Cookie: cookie } }));
    const login = async (error?: string) => {
      const start = await auth.handler(
        new Request(origin + '/api/auth/sign-in/social', {
          method: 'POST',
          headers: { Origin: origin, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: 'google',
            callbackURL: '/',
            errorCallbackURL: '/auth/error',
            disableRedirect: true,
          }),
        }),
      );
      expect(start.status).toBe(200);
      expect(
        start.headers
          .getSetCookie()
          .some(c => c.includes('restriction_notice=;') && c.includes('Max-Age=0')),
      ).toBe(true);
      const authorization = new URL((await start.json()).url);
      const state = authorization.searchParams.get('state')!;
      const cookies = start.headers
        .getSetCookie()
        .map(c => c.split(';')[0])
        .join('; ');
      return request(
        `/callback/google?state=${encodeURIComponent(state)}&${error ? `error=${error}` : 'code=fixture'}`,
        cookies,
      );
    };
    const notice = async (cookie = '') => {
      const response = await request('/account-restriction', cookie);
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      return response.json();
    };
    try {
      await db.insert(user).values({
        id,
        name: id,
        displayName: id,
        email: `${id}@invalid.local`,
        emailVerified: true,
        currency: 'USD',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        banned: true,
        banExpires: expires,
        banReason: 'Private moderation evidence',
      });
      await db.insert(account).values({
        id: crypto.randomUUID(),
        userId: id,
        accountId: id,
        providerId: 'google',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      expect(await notice()).toEqual({ status: 'unknown' });
      const legacyError = await request('/error?error=banned&error_description=private');
      expect(legacyError.status).toBe(302);
      expect(legacyError.headers.get('location')).toBe('/auth/error?error=banned');
      expect(await (await request(`/account-restriction?userId=${id}`)).json()).toEqual({
        status: 'unknown',
      });

      const blocked = await login();
      expect(blocked.status).toBe(302);
      expect(blocked.headers.get('location')).toStartWith('/auth/error?error=banned');
      expect(blocked.headers.get('location')).not.toContain(id);
      const setCookie = blocked.headers
        .getSetCookie()
        .find(c => c.includes('restriction_notice='))!;
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie.includes('; Secure')).toBe(
        Boolean(ctx.createAuthCookie('restriction_notice').attributes.secure),
      );
      expect(setCookie).toContain('Path=/api/auth');
      const cookie = setCookie.split(';')[0]!;
      const cookieName = cookie.slice(0, cookie.indexOf('='));
      expect(cookieName).toBe(ctx.createAuthCookie('restriction_notice').name);
      expect(await notice(cookie)).toEqual({
        status: 'suspended',
        expiresAt: expires.toISOString(),
      });
      expect(await db.select().from(session).where(eq(session.userId, id))).toHaveLength(0);
      expect(await notice(cookie + 'tampered')).toEqual({ status: 'unknown' });
      const expiredProof = (
        await serializeSignedCookie(
          cookieName,
          JSON.stringify({
            userId: id,
            expiresAt: Date.now() - 1000,
          }),
          ctx.secret,
        )
      ).split(';')[0]!;
      expect(await notice(expiredProof)).toEqual({ status: 'unknown' });

      await db.update(user).set({ banExpires: null }).where(eq(user.id, id));
      expect(await notice(cookie)).toEqual({ status: 'banned' });
      expect((await login()).headers.get('location')).toStartWith('/auth/error?error=banned');
      await db.update(user).set({ banned: false }).where(eq(user.id, id));
      expect(await notice(cookie)).toEqual({ status: 'available' });
      await db
        .update(user)
        .set({ banned: true, banExpires: new Date(Date.now() - 1000) })
        .where(eq(user.id, id));
      expect(await notice(cookie)).toEqual({ status: 'available' });
      const allowed = await login();
      expect(allowed.status).toBe(302);
      expect(allowed.headers.get('location')).toBe('/');
      expect(
        allowed.headers
          .getSetCookie()
          .some(c => c.includes('restriction_notice=;') && c.includes('Max-Age=0')),
      ).toBe(true);
      const sessions = await db.select().from(session).where(eq(session.userId, id));
      expect(sessions).toHaveLength(1);
      expect((await db.select().from(user).where(eq(user.id, id)))[0]!.banned).toBe(false);
      expect((await login('access_denied')).headers.get('location')).toBe(
        '/auth/error?error=access_denied',
      );
      expect((await request('/callback/google')).headers.get('location')).toStartWith(
        '/auth/error?',
      );
      await db.delete(user).where(eq(user.id, id));
      expect(await notice(cookie)).toEqual({ status: 'unknown' });
    } finally {
      provider.validateAuthorizationCode = originalValidate;
      provider.getUserInfo = originalUserInfo;
      await db.delete(user).where(eq(user.id, id));
    }
  },
);
