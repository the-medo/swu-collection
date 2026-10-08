import { asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { userProfile } from '../../db/schema/user_profile.ts';
import { userCredits } from '../../db/schema/patreon.ts';
import {
  creditGrantInput,
  shopPurchaseInput,
  SHOP_ITEMS,
  type CreditGrantInput,
  type CreditGrantResult,
  type CreditUsers,
  type ShopPurchaseInput,
  type ShopPurchaseResult,
  type UserTransactions,
  type UserWallet,
} from '../../../shared/types/credits.ts';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export const STARTING_CREDITS = 10_000;

export class CreditsError extends Error {
  constructor(
    message: string,
    public status: 400 | 404 | 409,
  ) {
    super(message);
  }
}

const walletColumns = {
  credits: userProfile.creditBalance,
  beskarCents: userProfile.beskarBalanceCents,
  achievementLimit: userProfile.achievementLimit,
  battlefieldLimit: userProfile.battlefieldLimit,
};

async function wallet(database: typeof db | Transaction, userId: string): Promise<UserWallet> {
  const [profile] = await database
    .select(walletColumns)
    .from(userProfile)
    .where(eq(userProfile.userId, userId));
  return profile ?? { credits: 0, beskarCents: 0, achievementLimit: 1, battlefieldLimit: 1 };
}

// The shared ledger's trigger maintains this total for every credit source.
export async function userCreditBalance(database: typeof db | Transaction, userId: string) {
  const [profile] = await database
    .select({ balance: userProfile.creditBalance })
    .from(userProfile)
    .where(eq(userProfile.userId, userId));
  const balance = profile?.balance ?? 0;
  if (!Number.isSafeInteger(balance))
    throw new CreditsError('This credit balance requires review.', 400);
  return balance;
}

async function lockWallet(tx: Transaction, userId: string) {
  const [target] = await tx
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, userId))
    .for('key share');
  if (!target) throw new CreditsError('User not found.', 404);
  await tx.insert(userProfile).values({ userId }).onConflictDoNothing();
  const [profile] = await tx
    .select(walletColumns)
    .from(userProfile)
    .where(eq(userProfile.userId, userId))
    .for('update');
  return profile;
}

export function createCreditsService(database = db) {
  return {
    async grantStartingCredits(userId: string) {
      // The migration uses the same key, so registration and backfills can overlap.
      await database
        .insert(userCredits)
        .values({
          userId,
          amount: STARTING_CREDITS,
          currency: 'credits',
          source: 'starting',
          sourceKey: `starting:${userId}`,
        })
        .onConflictDoNothing({ target: userCredits.sourceKey });
    },
    async wallet(userId: string): Promise<UserWallet> {
      const [target] = await database.select({ id: user.id }).from(user).where(eq(user.id, userId));
      if (!target) throw new CreditsError('User not found.', 404);
      return wallet(database, userId);
    },
    async transactions(userId: string, page: number): Promise<UserTransactions> {
      const pageSize = 25;
      const [total] = await database
        .select({ count: count() })
        .from(userCredits)
        .where(eq(userCredits.userId, userId));
      // Provider identifiers and admin request keys stay server-side.
      const rows = await database
        .select({
          id: userCredits.id,
          currency: userCredits.currency,
          amount: userCredits.amount,
          source: userCredits.source,
          itemId: userCredits.itemId,
          createdAt: userCredits.createdAt,
        })
        .from(userCredits)
        .where(eq(userCredits.userId, userId))
        .orderBy(desc(userCredits.createdAt), desc(userCredits.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize);
      return {
        page,
        pageSize,
        total: total.count,
        transactions: rows.map(row => ({ ...row, createdAt: row.createdAt.toISOString() })),
      };
    },
    async users(search: string): Promise<CreditUsers> {
      const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
      const matches = await database
        .select({
          id: user.id,
          name: user.name,
          displayName: user.displayName,
          email: user.email,
          balance: sql<number>`coalesce(${userProfile.creditBalance}, 0)`.mapWith(Number),
          beskarCents: sql<number>`coalesce(${userProfile.beskarBalanceCents}, 0)`.mapWith(Number),
        })
        .from(user)
        .leftJoin(userProfile, eq(userProfile.userId, user.id))
        .where(
          or(
            ilike(user.name, pattern),
            ilike(user.displayName, pattern),
            ilike(user.email, pattern),
          ),
        )
        .orderBy(asc(user.displayName), asc(user.id))
        .limit(26);
      return {
        users: matches.slice(0, 25).map(account => ({
          ...account,
          balance: Number.isSafeInteger(account.balance) ? account.balance : null,
        })),
        hasMore: matches.length > 25,
      };
    },
    async grant(
      userId: string,
      actorId: string,
      input: CreditGrantInput,
    ): Promise<CreditGrantResult> {
      const { amount, requestId, currency } = creditGrantInput.parse(input);
      const units = currency === 'beskar' ? Math.round(amount * 100) : amount;
      return database.transaction(async tx => {
        const current = await lockWallet(tx, userId);
        const sourceKey = `admin:${actorId}:${requestId}`;
        const [previous] = await tx
          .select()
          .from(userCredits)
          .where(eq(userCredits.sourceKey, sourceKey));
        function validateReceipt(receipt: typeof userCredits.$inferSelect | undefined) {
          if (
            !receipt ||
            receipt.userId !== userId ||
            receipt.amount !== units ||
            receipt.currency !== currency ||
            receipt.source !== 'admin'
          )
            throw new CreditsError(
              'This grant request was already used for a different award.',
              409,
            );
        }
        if (previous) {
          validateReceipt(previous);
          return {
            userId,
            amount,
            currency,
            balance: current.credits,
            beskarCents: current.beskarCents,
            applied: false,
          };
        }
        const balance = currency === 'beskar' ? current.beskarCents : current.credits;
        if (!Number.isSafeInteger(balance + units))
          throw new CreditsError('This award would exceed the supported balance.', 400);
        const inserted = await tx
          .insert(userCredits)
          .values({
            userId,
            amount: units,
            currency,
            source: 'admin',
            sourceKey,
          })
          .onConflictDoNothing({ target: userCredits.sourceKey })
          .returning({ id: userCredits.id });
        // A reused request can race across two different recipients.
        if (!inserted.length) {
          const [receipt] = await tx
            .select()
            .from(userCredits)
            .where(eq(userCredits.sourceKey, sourceKey));
          validateReceipt(receipt);
        }
        const updated = await wallet(tx, userId);
        return {
          userId,
          amount,
          currency,
          balance: updated.credits,
          beskarCents: updated.beskarCents,
          applied: inserted.length > 0,
        };
      });
    },
    async purchase(userId: string, input: ShopPurchaseInput): Promise<ShopPurchaseResult> {
      const { itemId, requestId } = shopPurchaseInput.parse(input);
      const item = SHOP_ITEMS.find(product => product.id === itemId)!;
      return database.transaction(async tx => {
        const current = await lockWallet(tx, userId);
        const sourceKey = `shop:${userId}:${requestId}`;
        const [previous] = await tx
          .select()
          .from(userCredits)
          .where(eq(userCredits.sourceKey, sourceKey));
        // Replay receipts before checking funds or limits: the first purchase may have used the last beskar.
        if (previous) {
          if (
            previous.userId !== userId ||
            previous.currency !== 'beskar' ||
            previous.source !== 'shop' ||
            previous.itemId !== itemId ||
            previous.amount !== -item.priceCents
          )
            throw new CreditsError('This purchase request was already used for another item.', 409);
          return { itemId, transactionId: previous.id, applied: false, wallet: current };
        }
        const slots =
          itemId === 'achievement-slot' ? current.achievementLimit : current.battlefieldLimit;
        if (slots >= item.maxSlots) throw new CreditsError('You have reached the slot limit.', 400);
        if (current.beskarCents < item.priceCents)
          throw new CreditsError('You do not have enough beskar.', 400);
        const [receipt] = await tx
          .insert(userCredits)
          .values({
            userId,
            currency: 'beskar',
            amount: -item.priceCents,
            itemId,
            source: 'shop',
            sourceKey,
          })
          .returning({ id: userCredits.id });
        await tx
          .update(userProfile)
          .set(
            itemId === 'achievement-slot'
              ? { achievementLimit: sql`${userProfile.achievementLimit} + 1` }
              : { battlefieldLimit: sql`${userProfile.battlefieldLimit} + 1` },
          )
          .where(eq(userProfile.userId, userId));
        return {
          itemId,
          transactionId: receipt.id,
          applied: true,
          wallet: await wallet(tx, userId),
        };
      });
    },
  };
}

export const creditsService = createCreditsService();
