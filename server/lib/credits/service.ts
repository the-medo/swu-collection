import { asc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { userCredits } from '../../db/schema/patreon.ts';
import {
  creditGrantInput,
  type CreditGrantInput,
  type CreditGrantResult,
  type CreditUsers,
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

function safeBalance(balance: number) {
  if (!Number.isSafeInteger(balance))
    throw new CreditsError('This credit balance requires review.', 400);
  return balance;
}

// All sources contribute to this balance; no provider-specific total is a wallet.
export async function userCreditBalance(database: typeof db | Transaction, userId: string) {
  const [row] = await database
    .select({ balance: sql<number>`coalesce(sum(${userCredits.amount}), 0)`.mapWith(Number) })
    .from(userCredits)
    .where(eq(userCredits.userId, userId));
  return safeBalance(row.balance);
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
          source: 'starting',
          sourceKey: `starting:${userId}`,
        })
        .onConflictDoNothing({ target: userCredits.sourceKey });
    },
    async users(search: string): Promise<CreditUsers> {
      const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
      const matches = await database
        .select({ id: user.id, name: user.name, displayName: user.displayName, email: user.email })
        .from(user)
        .where(
          or(
            ilike(user.name, pattern),
            ilike(user.displayName, pattern),
            ilike(user.email, pattern),
          ),
        )
        .orderBy(asc(user.displayName), asc(user.id))
        .limit(26);
      const users = matches.slice(0, 25);
      const balances = users.length
        ? await database
            .select({
              userId: userCredits.userId,
              balance: sql<number>`sum(${userCredits.amount})`.mapWith(Number),
            })
            .from(userCredits)
            .where(
              inArray(
                userCredits.userId,
                users.map(account => account.id),
              ),
            )
            .groupBy(userCredits.userId)
        : [];
      const byUser = new Map(
        balances.map(row => [row.userId, Number.isSafeInteger(row.balance) ? row.balance : null]),
      );
      return {
        users: users.map(account => ({
          ...account,
          balance: byUser.has(account.id) ? byUser.get(account.id)! : 0,
        })),
        hasMore: matches.length > 25,
      };
    },
    async grant(
      userId: string,
      actorId: string,
      input: CreditGrantInput,
    ): Promise<CreditGrantResult> {
      const { amount, requestId } = creditGrantInput.parse(input);
      return database.transaction(async tx => {
        const [target] = await tx
          .select({ id: user.id })
          .from(user)
          .where(eq(user.id, userId))
          .for('update');
        if (!target) throw new CreditsError('User not found.', 404);
        // Retain the granting admin in the ledger and make request retries idempotent.
        const sourceKey = `admin:${actorId}:${requestId}`;
        const inserted = await tx
          .insert(userCredits)
          .values({ userId, amount, source: 'admin', sourceKey })
          .onConflictDoNothing({ target: userCredits.sourceKey })
          .returning({ id: userCredits.id });
        if (!inserted.length) {
          const [previous] = await tx
            .select()
            .from(userCredits)
            .where(eq(userCredits.sourceKey, sourceKey));
          if (
            previous.userId !== userId ||
            previous.amount !== amount ||
            previous.source !== 'admin'
          )
            throw new CreditsError(
              'This grant request was already used for a different award.',
              409,
            );
        }
        // An unsafe total rejects and rolls back this award, including its source key.
        const balance = await userCreditBalance(tx, userId);
        return { userId, amount, balance, applied: inserted.length > 0 };
      });
    },
  };
}

export const creditsService = createCreditsService();
