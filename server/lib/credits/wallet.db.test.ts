import { expect, test } from 'bun:test';
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { userProfile } from '../../db/schema/user_profile.ts';
import { userCredits } from '../../db/schema/patreon.ts';
import { createCreditsService, creditsService } from './service.ts';
import { battlefieldService } from '../battlefield/service.ts';

const enabled = process.env.SWUBASE_CREDITS_DB_TEST === '1';
if (enabled) {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
    throw new Error('Wallet tests require an isolated worktree database.');
}

async function accounts(ids: string[]) {
  await db.insert(user).values(
    ids.map(id => ({
      id,
      name: id,
      displayName: id,
      email: id + '@invalid.local',
      emailVerified: false,
      currency: 'USD',
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  );
}

test.skipIf(!enabled)(
  'fractional beskar grants, both shop products, receipts and private history share one wallet',
  async () => {
    const [buyer, admin] = Array.from({ length: 2 }, () => 'wallet-' + crypto.randomUUID());
    try {
      await accounts([buyer, admin]);
      await creditsService.grantStartingCredits(buyer);
      await creditsService.grant(buyer, admin, {
        amount: 500,
        currency: 'credits',
        requestId: crypto.randomUUID(),
      });
      const award = { amount: 7.75, currency: 'beskar' as const, requestId: crypto.randomUUID() };
      expect(await creditsService.grant(buyer, admin, award)).toMatchObject({
        amount: 7.75,
        beskarCents: 775,
        balance: 10500,
        applied: true,
      });
      expect(await creditsService.wallet(buyer)).toEqual({
        credits: 10500,
        beskarCents: 775,
        achievementLimit: 1,
        battlefieldLimit: 1,
      });
      const achievement = { itemId: 'achievement-slot' as const, requestId: crypto.randomUUID() };
      expect(await creditsService.purchase(buyer, achievement)).toMatchObject({
        applied: true,
        wallet: { beskarCents: 275, achievementLimit: 2, battlefieldLimit: 1, credits: 10500 },
      });
      await expect(
        creditsService.purchase(buyer, {
          itemId: 'battlefield-slot',
          requestId: crypto.randomUUID(),
        }),
      ).rejects.toThrow('enough beskar');
      expect((await creditsService.wallet(buyer)).beskarCents).toBe(275);
      await creditsService.grant(buyer, admin, {
        amount: 0.25,
        currency: 'beskar',
        requestId: crypto.randomUUID(),
      });
      const battlefield = { itemId: 'battlefield-slot' as const, requestId: crypto.randomUUID() };
      const bought = await creditsService.purchase(buyer, battlefield);
      expect(bought).toMatchObject({
        applied: true,
        wallet: { beskarCents: 0, achievementLimit: 2, battlefieldLimit: 2, credits: 10500 },
      });
      // Replay still works with zero funds after the first purchase consumed them.
      expect(await creditsService.purchase(buyer, battlefield)).toMatchObject({
        applied: false,
        transactionId: bought.transactionId,
        wallet: bought.wallet,
      });
      expect((await creditsService.purchase(buyer, achievement)).applied).toBe(false);
      await expect(
        creditsService.purchase(buyer, { ...achievement, itemId: 'battlefield-slot' }),
      ).rejects.toThrow('another item');
      expect(await creditsService.grant(buyer, admin, award)).toMatchObject({
        applied: false,
        beskarCents: 0,
      });
      await expect(
        creditsService.grant(buyer, admin, { ...award, currency: 'credits', amount: 7 }),
      ).rejects.toThrow('different award');
      const editor = await battlefieldService.editor(buyer);
      expect(editor.balance).toBe(10500);
      expect(editor.limit).toBe(2);
      const history = await creditsService.transactions(buyer, 1);
      expect(history.total).toBe(6);
      expect(
        history.transactions
          .filter(row => row.source === 'shop')
          .map(row => row.amount)
          .sort(),
      ).toEqual([-300, -500]);
      expect(
        history.transactions.find(
          row => row.currency === 'beskar' && row.source === 'admin' && row.amount === 775,
        ),
      ).toBeDefined();
      expect(JSON.stringify(history)).not.toContain('sourceKey');
      expect(JSON.stringify(history)).not.toContain(admin);
      expect((await creditsService.transactions(admin, 1)).transactions).toHaveLength(0);
      await db.insert(userCredits).values(
        Array.from({ length: 30 }, () => ({
          userId: buyer,
          amount: 1,
          source: 'pagination-fixture',
          sourceKey: crypto.randomUUID(),
        })),
      );
      const pages = await Promise.all([1, 2].map(page => creditsService.transactions(buyer, page)));
      expect(pages.map(page => page.transactions.length)).toEqual([25, 11]);
      expect(new Set(pages.flatMap(page => page.transactions.map(row => row.id))).size).toBe(36);
      expect(pages[0].total).toBe(36);
      await expect(
        db
          .insert(userCredits)
          .values({
            userId: buyer,
            currency: 'beskar',
            amount: -1,
            source: 'fixture',
            sourceKey: crypto.randomUUID(),
          })
          .execute(),
      ).rejects.toThrow();
      expect((await creditsService.wallet(buyer)).beskarCents).toBe(0);
      await expect(creditsService.wallet('missing-user')).rejects.toThrow('User not found');
      await expect(creditsService.purchase('missing-user', battlefield)).rejects.toThrow(
        'User not found',
      );
    } finally {
      await db.delete(user).where(inArray(user.id, [buyer, admin]));
    }
  },
);

test.skipIf(!enabled)(
  'concurrent purchases cannot double-charge, overspend, lose awards or exceed slot caps',
  async () => {
    const [buyer, admin, other] = Array.from(
      { length: 3 },
      () => 'wallet-race-' + crypto.randomUUID(),
    );
    try {
      await accounts([buyer, admin, other]);
      await creditsService.grant(buyer, admin, {
        amount: 8,
        currency: 'beskar',
        requestId: crypto.randomUUID(),
      });
      const input = { itemId: 'achievement-slot' as const, requestId: crypto.randomUUID() };
      const duplicate = await Promise.all(
        Array.from({ length: 8 }, () => creditsService.purchase(buyer, input)),
      );
      expect(duplicate.filter(result => result.applied)).toHaveLength(1);
      expect(new Set(duplicate.map(result => result.transactionId)).size).toBe(1);
      const lastFunds = await Promise.allSettled(
        Array.from({ length: 6 }, () =>
          creditsService.purchase(buyer, {
            itemId: 'battlefield-slot',
            requestId: crypto.randomUUID(),
          }),
        ),
      );
      expect(lastFunds.filter(result => result.status === 'fulfilled')).toHaveLength(1);
      expect(await creditsService.wallet(buyer)).toMatchObject({
        beskarCents: 0,
        achievementLimit: 2,
        battlefieldLimit: 2,
      });
      const combined = await Promise.all([
        ...Array.from({ length: 5 }, () =>
          creditsService.grant(buyer, admin, {
            amount: 1,
            currency: 'beskar',
            requestId: crypto.randomUUID(),
          }),
        ),
        ...Array.from({ length: 5 }, () =>
          creditsService.grant(buyer, admin, {
            amount: 100,
            currency: 'credits',
            requestId: crypto.randomUUID(),
          }),
        ),
      ]);
      expect(combined.every(result => result.applied)).toBe(true);
      expect(await creditsService.wallet(buyer)).toMatchObject({ credits: 500, beskarCents: 500 });
      await db
        .update(userProfile)
        .set({ battlefieldLimit: 99 })
        .where(eq(userProfile.userId, buyer));
      const capped = await Promise.allSettled(
        Array.from({ length: 4 }, () =>
          creditsService.purchase(buyer, {
            itemId: 'battlefield-slot',
            requestId: crypto.randomUUID(),
          }),
        ),
      );
      expect(capped.filter(result => result.status === 'fulfilled')).toHaveLength(1);
      expect(await creditsService.wallet(buyer)).toMatchObject({
        beskarCents: 200,
        battlefieldLimit: 100,
      });
      await db
        .update(userProfile)
        .set({ achievementLimit: 2_147_483_647 })
        .where(eq(userProfile.userId, buyer));
      await creditsService.grant(buyer, admin, {
        amount: 3,
        currency: 'beskar',
        requestId: crypto.randomUUID(),
      });
      await expect(
        creditsService.purchase(buyer, {
          itemId: 'achievement-slot',
          requestId: crypto.randomUUID(),
        }),
      ).rejects.toThrow('slot limit');
      const sharedKey = crypto.randomUUID();
      const recipients = await Promise.allSettled(
        [buyer, other].map(id =>
          creditsService.grant(id, admin, {
            amount: 0.01,
            currency: 'beskar',
            requestId: sharedKey,
          }),
        ),
      );
      expect(recipients.filter(result => result.status === 'fulfilled')).toHaveLength(1);
      expect(recipients.filter(result => result.status === 'rejected')).toHaveLength(1);
      for (const id of [buyer, other]) {
        const [totals] = await db
          .select({
            credits:
              sql<number>`coalesce(sum(amount) FILTER (WHERE currency='credits'), 0)`.mapWith(
                Number,
              ),
            beskar: sql<number>`coalesce(sum(amount) FILTER (WHERE currency='beskar'), 0)`.mapWith(
              Number,
            ),
          })
          .from(userCredits)
          .where(eq(userCredits.userId, id));
        expect(await creditsService.wallet(id)).toMatchObject({
          credits: totals.credits,
          beskarCents: totals.beskar,
        });
      }
    } finally {
      await db.delete(user).where(inArray(user.id, [buyer, admin, other]));
    }
  },
  30_000,
);

test.skipIf(!enabled)(
  'an entitlement failure rolls back the debit and receipt so the same purchase can safely retry',
  async () => {
    const buyer = 'wallet-rollback-' + crypto.randomUUID();
    try {
      await accounts([buyer]);
      await creditsService.grant(buyer, buyer, {
        amount: 5,
        currency: 'beskar',
        requestId: crypto.randomUUID(),
      });
      const input = { itemId: 'achievement-slot' as const, requestId: crypto.randomUUID() };
      // Fault at the entitlement write after the real ledger INSERT/trigger has run.
      const failing = createCreditsService(
        new Proxy(db, {
          get(target, key) {
            if (key !== 'transaction') return Reflect.get(target, key);
            return (callback: Parameters<typeof db.transaction>[0]) =>
              db.transaction(tx =>
                callback(
                  new Proxy(tx, {
                    get(transaction, operation) {
                      if (operation === 'update')
                        return () => {
                          throw new Error('Fixture entitlement failure');
                        };
                      return Reflect.get(transaction, operation);
                    },
                  }),
                ),
              );
          },
        }),
      );
      await expect(failing.purchase(buyer, input)).rejects.toThrow('Fixture entitlement failure');
      expect(await creditsService.wallet(buyer)).toMatchObject({
        beskarCents: 500,
        achievementLimit: 1,
      });
      expect(
        await db
          .select()
          .from(userCredits)
          .where(eq(userCredits.sourceKey, `shop:${buyer}:${input.requestId}`)),
      ).toHaveLength(0);
      expect((await creditsService.purchase(buyer, input)).applied).toBe(true);
      expect(await creditsService.wallet(buyer)).toMatchObject({
        beskarCents: 0,
        achievementLimit: 2,
      });
    } finally {
      await db.delete(user).where(eq(user.id, buyer));
    }
  },
);
