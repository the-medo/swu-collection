import { expect, test } from 'bun:test';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { patreonMember, userCredits } from '../../db/schema/patreon.ts';
import { createPatreonCredits } from './credits.ts';
import type { MemberSnapshot } from './model.ts';
import { auth } from '../../auth/auth.ts';
import { STARTING_CREDITS } from '../credits/service.ts';

test.skipIf(process.env.PATREON_DB_TEST !== '1')(
  'credit backfill, concurrent retries, matching, holds and transactional rollback',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Use an isolated worktree database.');
    const campaignId = crypto.randomUUID();
    const users = Array.from({ length: 4 }, () => crypto.randomUUID());
    const email = `${users[0]}@example.invalid`;
    const credits = createPatreonCredits();
    let clock = Date.now();
    const snapshot = (
      memberId: string,
      lifetimeCents: number | null,
      extra: Partial<MemberSnapshot> = {},
    ): MemberSnapshot => ({
      campaignId,
      memberId,
      lifetimeCents,
      email,
      name: 'Fixture',
      patronStatus: 'active_patron',
      lastChargeAt: new Date(),
      lastChargeStatus: 'Paid',
      observedAt: new Date(++clock),
      ...extra,
    });
    const member = async (id: string) =>
      (
        await db
          .select()
          .from(patreonMember)
          .where(and(eq(patreonMember.campaignId, campaignId), eq(patreonMember.memberId, id)))
      )[0];
    const balance = async (id = users[0]) =>
      (
        await db
          .select({ amount: sql<number>`coalesce(sum(${userCredits.amount}), 0)`.mapWith(Number) })
          .from(userCredits)
          .where(eq(userCredits.userId, id))
      )[0].amount;
    try {
      await db.insert(user).values(
        users.map((id, i) => ({
          id,
          name: 'Patreon fixture',
          displayName: id,
          email: i === 0 ? email.toUpperCase() : `${id}@example.invalid`,
          emailVerified: i !== 1,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      expect(await credits.apply(snapshot('member', 1250))).toBe(12500);
      const payment = snapshot('member', 1550);
      expect(
        (await Promise.all(Array.from({ length: 8 }, () => credits.apply(payment)))).reduce(
          (a, b) => a + b,
          0,
        ),
      ).toBe(3000);
      expect(await balance()).toBe(15500);
      expect((await member('member')).creditedCents).toBe(1550);
      // Old in-flight pages cannot flag a false decrease or revert a current email.
      expect(
        await credits.apply(
          snapshot('member', 1000, {
            observedAt: new Date(clock - 1000),
            email: 'old@example.invalid',
          }),
        ),
      ).toBe(0);
      expect((await member('member')).reviewReason).toBeNull();
      expect((await member('member')).email).toBe(email);
      // Declined current charges do not erase successful historical payments.
      expect(
        await credits.apply(
          snapshot('former', 100, { patronStatus: 'former_patron', lastChargeStatus: 'Declined' }),
        ),
      ).toBe(1000);

      const pendingEmail = `${users[1]}@example.invalid`;
      expect(await credits.apply(snapshot('pending', 225, { email: pendingEmail }))).toBe(0);
      expect((await member('pending')).creditedCents).toBe(0);
      await credits.reconcileUser(users[1]);
      expect(await balance(users[1])).toBe(0);
      await db.update(user).set({ emailVerified: true }).where(eq(user.id, users[1]));
      const [verifiedAccount] = await db.select().from(user).where(eq(user.id, users[1]));
      await auth.options.databaseHooks!.user!.update!.after!(verifiedAccount);
      await credits.reconcileUser(users[1]);
      expect(await balance(users[1])).toBe(2250);

      const lateId = crypto.randomUUID();
      users.push(lateId);
      expect(
        await credits.apply(snapshot('late', 99, { email: `${lateId}@example.invalid` })),
      ).toBe(0);
      await db.insert(user).values({
        id: lateId,
        name: 'Late signup',
        displayName: lateId,
        email: `${lateId}@example.invalid`,
        emailVerified: true,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const [createdAccount] = await db.select().from(user).where(eq(user.id, lateId));
      await auth.options.databaseHooks!.user!.create!.after!(createdAccount);
      expect(await balance(lateId)).toBe(STARTING_CREDITS + 990);

      expect(await credits.apply(snapshot('missing-email', 100, { email: null }))).toBe(0);
      expect((await member('missing-email')).reviewReason).toBe('email_unavailable');
      expect(await credits.apply(snapshot('missing-amount', null))).toBe(0);
      expect((await member('missing-amount')).reviewReason).toBe('missing_amount');
      expect(await credits.apply(snapshot('refunded', 100, { lastChargeStatus: 'Refunded' }))).toBe(
        0,
      );
      expect((await member('refunded')).reviewReason).toBe('payment_review');
      expect(await credits.apply(snapshot('refunded', 200))).toBe(0);
      await db.update(user).set({ email: email.toLowerCase() }).where(eq(user.id, users[2]));
      expect(await credits.apply(snapshot('ambiguous', 100))).toBe(0);
      expect((await member('ambiguous')).reviewReason).toBe('ambiguous_email');
      await db
        .update(user)
        .set({ email: `${users[2]}@example.invalid` })
        .where(eq(user.id, users[2]));

      // A known membership must not transfer when the Patreon email changes.
      expect(
        await credits.apply(snapshot('member', 1600, { email: `${users[2]}@example.invalid` })),
      ).toBe(0);
      expect((await member('member')).userId).toBe(users[0]);
      expect((await member('member')).reviewReason).toBe('email_changed');
      expect(await credits.apply(snapshot('member', 1600))).toBe(500);
      expect(await credits.apply(snapshot('member', 1500))).toBe(0);
      expect((await member('member')).reviewReason).toBe('lifetime_decreased');
      expect(await credits.apply(snapshot('member', 1900))).toBe(0);
      expect((await member('member')).creditedCents).toBe(1600);
      await expect(credits.apply(snapshot('member', 1500), users[3])).rejects.toThrow(
        'at least as high',
      );
      expect((await member('member')).reviewReason).toBe('lifetime_decreased');
      expect(await credits.apply(snapshot('member', 1900), users[3])).toBe(3000);
      expect((await member('member')).reviewedBy).toBe(users[3]);
      expect((await member('member')).reviewedAt).not.toBeNull();
      expect((await member('member')).creditedCents).toBe(1900);
      await credits.markInvalid(campaignId, 'bad-record', new Date(++clock));
      expect((await member('bad-record')).reviewReason).toBe('invalid_member');
      expect(await credits.apply(snapshot('bad-record', 20))).toBe(200);

      // Rechecking malformed data persists a valid snapshot even if the member
      // is not currently Paid or has not created a matching account yet.
      await credits.markInvalid(campaignId, 'invalid-unmatched', new Date(++clock));
      expect(
        await credits.apply(
          snapshot('invalid-unmatched', 100, {
            email: `${crypto.randomUUID()}@example.invalid`,
            lastChargeStatus: 'Declined',
          }),
          users[3],
        ),
      ).toBe(0);
      expect((await member('invalid-unmatched')).reviewReason).toBeNull();
      expect((await member('invalid-unmatched')).lifetimeCents).toBe(100);
      expect((await member('invalid-unmatched')).userId).toBeNull();
      expect((await member('invalid-unmatched')).reviewedBy).toBe(users[3]);
      await credits.markInvalid(campaignId, 'bad-record', new Date(++clock));
      expect(await credits.apply(snapshot('bad-record', 10), users[3])).toBe(0);
      expect((await member('bad-record')).reviewReason).toBe('lifetime_decreased');
      expect((await member('bad-record')).creditedCents).toBe(20);

      // Failure between award and checkpoint rolls back both writes.
      expect(await credits.apply(snapshot('rollback', 10))).toBe(100);
      const key = `patreon:${campaignId}:rollback:20`;
      await db
        .insert(userCredits)
        .values({ userId: users[0], amount: 1, source: 'fixture', sourceKey: key });
      await expect(credits.apply(snapshot('rollback', 20))).rejects.toThrow();
      expect((await member('rollback')).creditedCents).toBe(10);
      await db.delete(userCredits).where(eq(userCredits.sourceKey, key));
      expect(await credits.apply(snapshot('rollback', 20))).toBe(100);

      const old = snapshot('deleted', 100);
      await credits.markDeleted(campaignId, 'deleted', new Date(++clock));
      expect(await credits.apply(old)).toBe(0);
      expect((await member('deleted')).deletedAt).not.toBeNull();
      await db.delete(user).where(eq(user.id, users[1]));
      expect(
        await credits.apply(snapshot('pending', 300, { email: `${users[2]}@example.invalid` })),
      ).toBe(0);
      expect((await member('pending')).reviewReason).toBe('account_removed');

      // Run the real sanitizer's new statements against shadow tables only.
      const sanitizer = await Bun.file('scripts/remote-dev/sql/001-core-data.sql').text();
      const cleanup = sanitizer.match(
        /TRUNCATE TABLE user_credits, patreon_member, patreon_connection;/,
      )![0];
      const assertion = sanitizer.match(
        /IF EXISTS \(SELECT 1 FROM user_credits\)[\s\S]*?END IF;/,
      )![0];
      await db.transaction(async tx => {
        for (const name of ['user_credits', 'patreon_member', 'patreon_connection']) {
          await tx.execute(sql.raw(`CREATE TEMP TABLE ${name} (private_data text) ON COMMIT DROP`));
          await tx.execute(sql.raw(`INSERT INTO ${name} VALUES ('private fixture')`));
        }
        await tx.execute(sql.raw(cleanup));
        await tx.execute(sql.raw(`DO $$ BEGIN ${assertion} END $$;`));
      });
    } finally {
      await db.delete(patreonMember).where(eq(patreonMember.campaignId, campaignId));
      await db.delete(user).where(inArray(user.id, users));
    }
  },
  30_000,
);
