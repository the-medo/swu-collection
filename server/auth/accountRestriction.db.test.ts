import postgres from 'postgres';
import { AppRealtimeAccess } from '../lib/ws/appRealtimeAccess.ts';
import { expect, test } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';
import { getCookies } from 'better-auth/cookies';
import { serializeSignedCookie } from 'better-call';
import { auth } from './auth.ts';
import { db } from '../db';
import { user, session } from '../db/schema/auth-schema.ts';
const enabled = process.env.SWUBASE_USER_REPORTS_DB_TEST === '1';
if (enabled) {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
    throw new Error('Auth restriction tests require an isolated worktree database.');
}

test.skipIf(!enabled)(
  'real Better Auth rejects sessions created after a restriction and protects direct auth mutations',
  async () => {
    const ids = ['target', 'organizer', 'moderator'].map(
      role => `${role}-restriction-test-${crypto.randomUUID()}`,
    );
    const target = ids[0]!;
    const origin = process.env.BETTER_AUTH_URL!;
    const secret = process.env.BETTER_AUTH_SECRET!;
    const cookieName = getCookies({
      baseURL: origin,
      advanced: { cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX },
    }).sessionToken.name;
    const newSession = async (id: string) => {
      const token = crypto.randomUUID();
      await db.insert(session).values({
        id: crypto.randomUUID(),
        token,
        userId: id,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      });
      const signed = (await serializeSignedCookie(cookieName, token, secret)).split(';')[0]!;
      return new Headers({ Cookie: signed, Origin: origin, 'Content-Type': 'application/json' });
    };
    await db.insert(user).values(
      ids.map((id, i) => ({
        id,
        name: id,
        displayName: id,
        email: `${id}@invalid.local`,
        emailVerified: false,
        currency: 'USD',
        role: i === 1 ? 'organizer' : i === 2 ? 'moderator' : 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    );
    try {
      expect((await auth.api.getSession({ headers: await newSession(target) }))?.user.id).toBe(
        target,
      );
      await db.update(user).set({ banned: true, banExpires: null }).where(eq(user.id, target));
      // This models the OAuth race: a callback inserts its session after the ban commits.
      await newSession(target);
      const lateSession = (await db.select().from(session).where(eq(session.userId, target)))[0]!;
      const realtimeSql = postgres(process.env.DATABASE_URL!);
      try {
        expect(
          await new AppRealtimeAccess(realtimeSql).check({
            userId: target,
            sessionId: lateSession.id,
          }),
        ).toBeNull();
      } finally {
        await realtimeSql.end();
      }
      await expect(
        auth.api.getSession({ headers: await newSession(target) }),
      ).rejects.toMatchObject({ body: { code: 'BANNED_USER' } });
      expect(await db.select().from(session).where(eq(session.userId, target))).toHaveLength(0);
      const response = await auth.handler(
        new Request(origin + '/api/auth/update-user', {
          method: 'POST',
          headers: await newSession(target),
          body: JSON.stringify({ displayName: 'Banned edit should fail' }),
        }),
      );
      expect(response.status).toBe(403);
      expect((await db.select().from(user).where(eq(user.id, target)))[0]!.displayName).toBe(
        target,
      );
      for (const id of ids.slice(1)) {
        const headers = await newSession(id);
        for (const endpoint of ['ban-user', 'unban-user']) {
          const result = await auth.handler(
            new Request(origin + '/api/auth/admin/' + endpoint, {
              method: 'POST',
              headers,
              body: JSON.stringify({ userId: target }),
            }),
          );
          expect(result.status).toBe(403);
        }
      }
      // A time-limited active suspension is also enforced; once it expires, access resumes.
      await db
        .update(user)
        .set({ banExpires: new Date(Date.now() + 86400000) })
        .where(eq(user.id, target));
      await expect(
        auth.api.getSession({ headers: await newSession(target) }),
      ).rejects.toMatchObject({ body: { code: 'BANNED_USER' } });
      await db
        .update(user)
        .set({ banExpires: new Date(Date.now() - 1000) })
        .where(eq(user.id, target));
      expect((await auth.api.getSession({ headers: await newSession(target) }))?.user.id).toBe(
        target,
      );
    } finally {
      await db.delete(user).where(inArray(user.id, ids));
    }
  },
);
