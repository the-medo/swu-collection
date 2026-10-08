import { expect, test } from 'bun:test';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { patreonMember, userCredits } from '../../db/schema/patreon.ts';
import { auth, type AuthExtension } from '../../auth/auth.ts';
import { createCreditsAdminRoute } from '../../routes/admin/credits/index.ts';
import { creditsService, STARTING_CREDITS, userCreditBalance } from './service.ts';
import { battlefieldService } from '../battlefield/service.ts';
import { createUserCreditHooks } from '../../auth/userCredits.ts';
import { patreonCredits } from '../patreon/credits.ts';

const enabled = process.env.SWUBASE_CREDITS_DB_TEST === '1';
if (enabled) {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
    throw new Error('Credit tests require an isolated worktree database.');
}

test.skipIf(!enabled)('starting credit backfill is additive and safe to repeat', async () => {
  const migration = await Bun.file('drizzle/0076_starting_credits.sql').text();
  await db.transaction(async tx => {
    await tx.execute(sql`CREATE TEMP TABLE "user" (id text) ON COMMIT DROP`);
    await tx.execute(sql`CREATE TEMP TABLE user_credits (
      user_id text, amount bigint, source text, source_key text UNIQUE
    ) ON COMMIT DROP`);
    await tx.execute(sql`INSERT INTO "user" VALUES ('paid'), ('empty'), ('seeded')`);
    await tx.execute(sql`INSERT INTO user_credits VALUES
      ('paid', 2500, 'provider', 'payment'),
      ('seeded', 10000, 'starting', 'starting:seeded')`);
    await tx.execute(sql.raw(migration));
    await tx.execute(sql.raw(migration));
    expect(
      await tx.execute(sql`SELECT user_id, sum(amount)::integer AS balance
      FROM user_credits GROUP BY user_id ORDER BY user_id`),
    ).toEqual([
      { user_id: 'empty', balance: STARTING_CREDITS },
      { user_id: 'paid', balance: STARTING_CREDITS + 2500 },
      { user_id: 'seeded', balance: STARTING_CREDITS },
    ]);
    expect(
      await tx.execute(sql`SELECT * FROM user_credits WHERE source = 'starting'`),
    ).toHaveLength(3);
  });
});

test.skipIf(!enabled)(
  'a failed creation grant preserves Patreon matching and is repaired once at sign-in',
  async () => {
    const id = `credit-recovery-${crypto.randomUUID()}`;
    const campaignId = crypto.randomUUID();
    let attempts = 0;
    const failures: unknown[] = [];
    const hooks = createUserCreditHooks({
      grant: async userId => {
        if (++attempts === 1) throw new Error('Temporary database failure.');
        await creditsService.grantStartingCredits(userId);
      },
      reconcile: account => patreonCredits.reconcileUser(account.id),
      onFailure: error => {
        failures.push(error);
      },
    });
    try {
      await db.insert(user).values({
        id,
        name: id,
        displayName: id,
        email: id + '@invalid.local',
        emailVerified: true,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await db.insert(patreonMember).values({
        campaignId,
        memberId: 'hook-recovery',
        email: id + '@invalid.local',
        lifetimeCents: 100,
        lastChargeStatus: 'Paid',
        observedAt: new Date(),
      });
      await hooks.created({ id });
      expect(failures).toHaveLength(1);
      expect(await userCreditBalance(db, id)).toBe(1000);
      const [member] = await db
        .select()
        .from(patreonMember)
        .where(eq(patreonMember.campaignId, campaignId));
      expect(member.userId).toBe(id);
      expect(member.creditedCents).toBe(100);
      await Promise.all(Array.from({ length: 8 }, () => hooks.sessionChanged({ userId: id })));
      expect(await userCreditBalance(db, id)).toBe(STARTING_CREDITS + 1000);
      expect(
        await db
          .select()
          .from(userCredits)
          .where(and(eq(userCredits.userId, id), eq(userCredits.source, 'starting'))),
      ).toHaveLength(1);
      expect(failures).toHaveLength(1);
    } finally {
      await db.delete(patreonMember).where(eq(patreonMember.campaignId, campaignId));
      await db.delete(user).where(eq(user.id, id));
    }
  },
);

test.skipIf(!enabled)(
  'registration and admin grants share the balance, enforce authorization and protect concurrent retries',
  async () => {
    const ids = Array.from({ length: 3 }, () => `credit-test-${crypto.randomUUID()}`);
    const search = crypto.randomUUID();
    let actor: string | null = null;
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        c.set(
          'user',
          actor ? ({ id: actor } as NonNullable<AuthExtension['Variables']['user']>) : null,
        );
        await next();
      })
      .route('/credits', createCreditsAdminRoute());
    const grant = (userId: string, amount: number, requestId = crypto.randomUUID()) =>
      app.request(`/credits/${userId}/grants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'swubase' },
        body: JSON.stringify({ amount, requestId }),
      });
    try {
      await db.insert(user).values(
        ids.map((id, i) => ({
          id,
          name: `${search} ${i === 0 ? '%_' : 'XX'}`,
          displayName: id,
          email: id + '@invalid.local',
          emailVerified: false,
          currency: 'USD',
          role: i === 1 ? 'admin' : 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      await db.insert(userCredits).values({
        userId: ids[0],
        amount: 2500,
        source: 'fixture-provider',
        sourceKey: crypto.randomUUID(),
      });
      const [account] = await db.select().from(user).where(eq(user.id, ids[0]));
      await Promise.all(
        Array.from({ length: 8 }, () => auth.options.databaseHooks!.user!.create!.after!(account)),
      );
      expect(await userCreditBalance(db, ids[0])).toBe(STARTING_CREDITS + 2500);
      expect(
        await db
          .select()
          .from(userCredits)
          .where(and(eq(userCredits.userId, ids[0]), eq(userCredits.source, 'starting'))),
      ).toHaveLength(1);

      expect((await app.request('/credits')).status).toBe(401);
      expect((await grant(ids[0], 100)).status).toBe(401);
      actor = ids[0];
      expect((await app.request('/credits')).status).toBe(403);
      expect((await grant(ids[0], 100)).status).toBe(403);
      actor = ids[1];
      expect((await grant('missing-user', 100)).status).toBe(404);
      const requestId = crypto.randomUUID();
      const first = await grant(ids[0], 500, requestId);
      expect(first.status).toBe(200);
      expect((await first.json()).data).toMatchObject({ balance: 13000, applied: true });
      const repeated = await grant(ids[0], 500, requestId);
      expect((await repeated.json()).data).toMatchObject({ balance: 13000, applied: false });
      expect((await grant(ids[0], 501, requestId)).status).toBe(409);
      expect((await grant(ids[2], 500, requestId)).status).toBe(409);
      expect(await userCreditBalance(db, ids[2])).toBe(0);

      const concurrentKey = crypto.randomUUID();
      const concurrent = await Promise.all(
        Array.from({ length: 8 }, () =>
          creditsService.grant(ids[0], ids[1], { amount: 700, requestId: concurrentKey }),
        ),
      );
      expect(concurrent.filter(result => result.applied)).toHaveLength(1);
      await Promise.all(
        Array.from({ length: 5 }, () =>
          creditsService.grant(ids[0], ids[1], { amount: 100, requestId: crypto.randomUUID() }),
        ),
      );
      const balance = STARTING_CREDITS + 2500 + 500 + 700 + 500;
      expect(await userCreditBalance(db, ids[0])).toBe(balance);
      expect((await battlefieldService.editor(ids[0])).balance).toBe(balance);
      const found = await creditsService.users(`${search} %_`);
      expect(found.users).toHaveLength(1);
      expect(found.users[0]).toMatchObject({ id: ids[0], balance });
      const list = await app.request(`/credits?search=${encodeURIComponent(search)}`);
      expect(list.headers.get('Cache-Control')).toBe('private, no-store');
      expect((await list.json()).data.users).toHaveLength(3);
      expect((await creditsService.users('')).users.length).toBeLessThanOrEqual(25);

      const overflowKey = crypto.randomUUID();
      expect((await grant(ids[0], Number.MAX_SAFE_INTEGER, overflowKey)).status).toBe(400);
      expect(await userCreditBalance(db, ids[0])).toBe(balance);
      expect(
        await db
          .select()
          .from(userCredits)
          .where(eq(userCredits.sourceKey, `admin:${ids[1]}:${overflowKey}`)),
      ).toHaveLength(0);
      await db.insert(userCredits).values({
        userId: ids[2],
        amount: Number.MAX_SAFE_INTEGER - 100,
        source: 'fixture-provider',
        sourceKey: crypto.randomUUID(),
      });
      const boundaryKey = crypto.randomUUID();
      expect((await grant(ids[2], 100, boundaryKey)).status).toBe(200);
      expect((await grant(ids[2], 100, boundaryKey)).status).toBe(200);
      expect(await userCreditBalance(db, ids[2])).toBe(Number.MAX_SAFE_INTEGER);
      await db.insert(userCredits).values({
        userId: ids[2],
        amount: 1,
        source: 'fixture-provider',
        sourceKey: crypto.randomUUID(),
      });
      const withUnsafeUser = await creditsService.users(search);
      expect(withUnsafeUser.users.find(account => account.id === ids[2])?.balance).toBeNull();
      expect(withUnsafeUser.users.find(account => account.id === ids[0])?.balance).toBe(balance);
      expect((await app.request(`/credits?search=${encodeURIComponent(search)}`)).status).toBe(200);
      expect(
        await db
          .select()
          .from(userCredits)
          .where(eq(userCredits.sourceKey, `admin:${ids[1]}:${requestId}`)),
      ).toHaveLength(1);
    } finally {
      await db.delete(user).where(inArray(user.id, ids));
    }
  },
  30_000,
);
