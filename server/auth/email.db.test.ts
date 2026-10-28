import { expect, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { auth } from './auth.ts';
import { db } from '../db';
import { account, session, user } from '../db/schema/auth-schema.ts';
import { authEmailOutbox } from '../db/schema/auth-email.ts';
import { openEmail, recipientHash } from '../lib/auth-email/crypto.ts';
import { STARTING_CREDITS, userCreditBalance } from '../lib/credits/service.ts';
import { createEmailVerificationToken } from 'better-auth/api';

const enabled = process.env.SWUBASE_EMAIL_AUTH_DB_TEST === '1';
if (enabled) {
  const url = new URL(process.env.DATABASE_URL!);
  if (
    url.hostname !== '127.0.0.1' ||
    !url.pathname.startsWith('/swubase_') ||
    process.env.AUTH_EMAIL_MODE !== 'capture'
  ) {
    throw new Error('Email tests require a local worktree database and capture mode.');
  }
}
const origin = process.env.BETTER_AUTH_URL!;
const password = 'a-long-fixture-password-123';
function request(path: string, body: unknown, cookie = '') {
  return auth.handler(
    new Request(`${origin}/api/auth/${path}`, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(body),
    }),
  );
}
function cookies(response: Response) {
  return response.headers
    .getSetCookie()
    .map(cookie => cookie.split(';')[0])
    .join('; ');
}
async function queued(email: string) {
  const [row] = await db
    .select()
    .from(authEmailOutbox)
    .where(eq(authEmailOutbox.recipientHash, recipientHash(email)));
  expect(row.payload).not.toContain(email);
  return (openEmail(row.payload!) as { email: { url: string; kind: string } }).email;
}
async function clearMail(email: string) {
  await db.delete(authEmailOutbox).where(eq(authEmailOutbox.recipientHash, recipientHash(email)));
}
async function googleLogin(email: string, subject: string) {
  const provider = (await auth.$context).socialProviders.find(
    provider => provider.id === 'google',
  )!;
  const originalValidate = provider.validateAuthorizationCode;
  const originalUserInfo = provider.getUserInfo;
  provider.validateAuthorizationCode = async () => ({ accessToken: 'fixture-only' });
  provider.getUserInfo = async () => ({
    user: { email, emailVerified: true, name: 'Email auth fixture' },
    data: { sub: subject },
  });

  try {
    const start = await request('sign-in/social', {
      provider: 'google',
      callbackURL: '/',
      errorCallbackURL: '/auth/error',
      disableRedirect: true,
    });
    expect(start.status).toBe(200);
    const authorization = new URL((await start.json()).url);
    return await auth.handler(
      new Request(
        `${origin}/api/auth/callback/google?code=fixture&state=${encodeURIComponent(authorization.searchParams.get('state')!)}`,
        { headers: { Cookie: cookies(start) } },
      ),
    );
  } finally {
    provider.validateAuthorizationCode = originalValidate;
    provider.getUserInfo = originalUserInfo;
  }
}

test.skipIf(!enabled)(
  'verified email account links Google, keeps its identity, resets passwords and revokes sessions',
  async () => {
    const email = `email-auth-${crypto.randomUUID()}@invalid.local`;
    try {
      const signup = await request('sign-up/email', {
        email,
        password: password + '-attacker',
        name: 'Email fixture',
        image: 'https://untrusted.invalid/avatar.png',
        callbackURL: `${origin}/auth/verify?verified=true`,
      });
      expect(signup.status).toBe(200);
      expect((await signup.json()).token).toBeNull();
      const [registered] = await db.select().from(user).where(eq(user.email, email));
      expect(registered.emailVerified).toBe(false);
      expect(registered.image).toBeNull();
      expect(registered.role).toBe('user');
      expect(await userCreditBalance(db, registered.id)).toBe(0);
      expect(
        (await request('sign-in/email', { email, password: password + '-attacker' })).status,
      ).toBe(403);
      expect((await queued(email)).kind).toBe('verification');
      await clearMail(email);
      expect(
        (await request('sign-up/email', { email, password, name: 'Mailbox owner' })).status,
      ).toBe(200);
      const notLinked = await googleLogin(email, email);
      expect(notLinked.headers.get('location')).toContain('account_not_linked');
      expect(
        await db
          .select()
          .from(account)
          .where(and(eq(account.userId, registered.id), eq(account.providerId, 'google'))),
      ).toHaveLength(0);
      const mail = await queued(email);
      expect(mail.kind).toBe('verification');
      const verify = await auth.handler(new Request(mail.url));
      expect(verify.status).toBe(302);
      const setupToken = new URL(verify.headers.get('location')!).searchParams.get('token');
      expect(await userCreditBalance(db, registered.id)).toBe(0);
      expect(
        (await request('reset-password', { token: setupToken, newPassword: password })).status,
      ).toBe(200);
      expect(
        (
          await request('reset-password', {
            token: setupToken,
            newPassword: password + '-attacker',
          })
        ).status,
      ).toBe(400);
      expect(
        (await request('sign-in/email', { email, password: password + '-attacker' })).status,
      ).toBe(401);
      expect(
        (await db.select().from(user).where(eq(user.id, registered.id)))[0].emailVerified,
      ).toBe(true);
      expect(await userCreditBalance(db, registered.id)).toBe(STARTING_CREDITS);
      const login = await request('sign-in/email', { email, password });
      expect(login.status).toBe(200);
      const headers = new Headers({ Cookie: cookies(login) });
      expect((await auth.api.getSession({ headers }))?.user.id).toBe(registered.id);
      const google = await googleLogin(email, email);
      expect(google.headers.get('location')).toBe('/');
      expect(
        (await auth.api.getSession({ headers: new Headers({ Cookie: cookies(google) }) }))?.user.id,
      ).toBe(registered.id);
      expect(await db.select().from(user).where(eq(user.email, email))).toHaveLength(1);
      expect(await userCreditBalance(db, registered.id)).toBe(STARTING_CREDITS);
      expect(
        (await request('admin/set-role', { userId: registered.id, role: 'admin' }, cookies(login)))
          .status,
      ).toBe(403);

      await clearMail(email);
      expect(
        (
          await request('request-password-reset', {
            email,
            redirectTo: `${origin}/auth/reset-password`,
          })
        ).status,
      ).toBe(200);
      const reset = await queued(email);
      expect(reset.kind).toBe('password-reset');
      const landing = await auth.handler(new Request(reset.url));
      const token = new URL(landing.headers.get('location')!).searchParams.get('token');
      expect(token).toBeTruthy();
      expect((await request('reset-password', { token, newPassword: 'short' })).status).toBe(400);
      expect(
        (await request('reset-password', { token, newPassword: password + '-new' })).status,
      ).toBe(200);
      expect(await db.select().from(session).where(eq(session.userId, registered.id))).toHaveLength(
        0,
      );
      expect(await auth.api.getSession({ headers })).toBeNull();
      expect((await request('reset-password', { token, newPassword: password })).status).toBe(400);
      expect((await request('sign-in/email', { email, password })).status).toBe(401);
      expect((await request('sign-in/email', { email, password: password + '-new' })).status).toBe(
        200,
      );
      expect((await googleLogin(email, email)).headers.get('location')).toBe('/');
      await db
        .update(user)
        .set({ banned: true, banReason: 'Test restriction' })
        .where(eq(user.id, registered.id));
      expect((await request('sign-in/email', { email, password: password + '-new' })).status).toBe(
        403,
      );
    } finally {
      await db.delete(user).where(eq(user.email, email));
      await clearMail(email);
    }
  },
);

test.skipIf(!enabled)(
  'existing Google account can add a password without creating another account or losing Google login',
  async () => {
    const email = `google-email-${crypto.randomUUID()}@invalid.local`;
    try {
      const google = await googleLogin(email, email);
      const current = await auth.api.getSession({
        headers: new Headers({ Cookie: cookies(google) }),
      });
      expect(current).toBeTruthy();
      const id = current!.user.id;
      const headers = new Headers({ Cookie: cookies(google) });
      expect(
        (
          await request('request-password-reset', {
            email,
            redirectTo: `${origin}/auth/reset-password`,
          })
        ).status,
      ).toBe(200);
      const landing = await auth.handler(new Request((await queued(email)).url));
      const token = new URL(landing.headers.get('location')!).searchParams.get('token');
      expect((await request('reset-password', { token, newPassword: password })).status).toBe(200);
      expect(await auth.api.getSession({ headers })).toBeNull();
      const login = await request('sign-in/email', { email, password });
      expect(login.status).toBe(200);
      expect(
        (await auth.api.getSession({ headers: new Headers({ Cookie: cookies(login) }) }))?.user.id,
      ).toBe(id);
      expect((await googleLogin(email, email)).headers.get('location')).toBe('/');
      expect(await db.select().from(user).where(eq(user.email, email))).toHaveLength(1);
      expect(
        (await db.select().from(account).where(eq(account.userId, id)))
          .map(row => row.providerId)
          .sort(),
      ).toEqual(['credential', 'google']);
      await clearMail(email);
      const duplicate = await request('sign-up/email', {
        email,
        password: password + '-attacker',
        name: 'Duplicate',
      });
      expect(duplicate.status).toBe(200);
      expect((await queued(email)).kind).toBe('existing-account');
      expect((await request('sign-in/email', { email, password })).status).toBe(200);
      expect(
        (await request('sign-in/email', { email, password: password + '-attacker' })).status,
      ).toBe(401);
      expect(await userCreditBalance(db, id)).toBe(STARTING_CREDITS);
      expect(
        (
          await request('request-password-reset', {
            email: `missing-${email}`,
            redirectTo: `${origin}/auth/reset-password`,
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await request('request-password-reset', {
            email,
            redirectTo: 'https://untrusted.invalid/reset',
          })
        ).status,
      ).toBe(403);
    } finally {
      await db.delete(user).where(eq(user.email, email));
      await clearMail(email);
    }
  },
);

test.skipIf(!enabled)(
  'a bare verification token cannot activate a password chosen before mailbox ownership',
  async () => {
    const email = `bare-verify-${crypto.randomUUID()}@invalid.local`;
    try {
      expect(
        (await request('sign-up/email', { email, password, name: 'Pending fixture' })).status,
      ).toBe(200);
      const token = await createEmailVerificationToken((await auth.$context).secret, email);
      const response = await auth.handler(
        new Request(
          `${origin}/api/auth/verify-email?token=${encodeURIComponent(token)}&callbackURL=${encodeURIComponent(origin + '/auth/verify?verified=true')}`,
        ),
      );
      expect(response.status).toBe(302);
      expect((await request('sign-in/email', { email, password })).status).toBe(401);
      expect((await googleLogin(email, email)).headers.get('location')).toBe('/');
      expect((await request('sign-in/email', { email, password })).status).toBe(401);
    } finally {
      await db.delete(user).where(eq(user.email, email));
      await clearMail(email);
    }
  },
);
