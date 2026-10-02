import { randomBytes } from 'node:crypto';
import { and, eq, gt, isNull, lt, or } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { meleeConnection, meleeVerification } from '../../db/schema/melee_connection.ts';
import type { MeleeConnectionStatus } from '../../../shared/lib/meleeConnection.ts';
import { bioContainsCode, fetchMeleeProfile, MeleeConnectionError } from './profile.ts';

const EXPIRES_AFTER_MS = 30 * 60 * 1000;
const RETRY_AFTER_MS = 10_000;

export function createMeleeConnectionService(
  database: typeof db,
  fetchProfile = fetchMeleeProfile,
  now = () => new Date(),
) {
  const status = async (userId: string): Promise<MeleeConnectionStatus> => {
    const [connections, challenges] = await Promise.all([
      database.select().from(meleeConnection).where(eq(meleeConnection.userId, userId)),
      database
        .select()
        .from(meleeVerification)
        .where(and(eq(meleeVerification.userId, userId), gt(meleeVerification.expiresAt, now()))),
    ]);
    const connection = connections[0];
    const challenge = challenges[0];
    return {
      connection: connection
        ? {
            meleeUserId: connection.meleeUserId,
            username: connection.username,
            displayName: connection.displayName,
            linkedAt: connection.linkedAt.toISOString(),
          }
        : null,
      challenge:
        !connection && challenge
          ? {
              username: challenge.username,
              code: challenge.code,
              expiresAt: challenge.expiresAt.toISOString(),
            }
          : null,
    };
  };

  return {
    status,
    async start(userId: string, username: string) {
      await database.transaction(async tx => {
        // Serialize changes for this SWUBASE user, including absent challenge rows.
        await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for('update');
        const [connection] = await tx
          .select()
          .from(meleeConnection)
          .where(eq(meleeConnection.userId, userId));
        if (connection)
          throw new MeleeConnectionError(
            'Disconnect your current Melee account before linking another.',
            409,
          );
        const [previous] = await tx
          .select()
          .from(meleeVerification)
          .where(eq(meleeVerification.userId, userId));
        const createdAt = now();
        if (previous && createdAt.getTime() - previous.createdAt.getTime() < RETRY_AFTER_MS) {
          throw new MeleeConnectionError(
            'Please wait 10 seconds before generating another code.',
            429,
          );
        }
        const challenge = {
          userId,
          username,
          createdAt,
          code: `SWUBASE-${randomBytes(24).toString('hex')}`,
          expiresAt: new Date(createdAt.getTime() + EXPIRES_AFTER_MS),
          lastAttemptAt: previous?.lastAttemptAt ?? null,
        };
        await tx.insert(meleeVerification).values(challenge).onConflictDoUpdate({
          target: meleeVerification.userId,
          set: challenge,
        });
      });
      return status(userId);
    },
    async verify(userId: string) {
      const attemptedAt = now();
      // Claim the attempt before the network request; concurrent requests cannot
      // bypass the cooldown, and Melee is never contacted without a live challenge.
      const [challenge] = await database
        .update(meleeVerification)
        .set({ lastAttemptAt: attemptedAt })
        .where(
          and(
            eq(meleeVerification.userId, userId),
            gt(meleeVerification.expiresAt, attemptedAt),
            or(
              isNull(meleeVerification.lastAttemptAt),
              lt(meleeVerification.lastAttemptAt, new Date(attemptedAt.getTime() - RETRY_AFTER_MS)),
            ),
          ),
        )
        .returning();
      if (!challenge) {
        const [pending] = await database
          .select()
          .from(meleeVerification)
          .where(eq(meleeVerification.userId, userId));
        if (!pending || pending.expiresAt <= attemptedAt) {
          throw new MeleeConnectionError(
            'Your verification code has expired or was canceled. Generate a new code.',
          );
        }
        throw new MeleeConnectionError(
          'Please wait 10 seconds before checking your bio again.',
          429,
        );
      }
      const profile = await fetchProfile(challenge.username);
      if (!bioContainsCode(profile.bio, challenge.code)) {
        throw new MeleeConnectionError(
          'The code was not found in your Melee bio. Paste it on its own line, save your profile, and try again.',
        );
      }
      try {
        await database.transaction(async tx => {
          await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for('update');
          const [consumed] = await tx
            .update(meleeVerification)
            .set({ code: '', username: '', expiresAt: new Date(0) })
            .where(
              and(
                eq(meleeVerification.userId, userId),
                eq(meleeVerification.code, challenge.code),
                gt(meleeVerification.expiresAt, now()),
              ),
            )
            .returning();
          if (!consumed)
            throw new MeleeConnectionError(
              'This code expired or changed while checking. Generate a new code and try again.',
              409,
            );
          await tx.insert(meleeConnection).values({
            userId,
            meleeUserId: profile.meleeUserId,
            username: profile.username,
            displayName: profile.displayName,
            linkedAt: now(),
          });
        });
      } catch (error) {
        const cause = error instanceof Error && error.cause ? error.cause : error;
        if (
          typeof cause === 'object' &&
          cause !== null &&
          'code' in cause &&
          cause.code === '23505'
        ) {
          throw new MeleeConnectionError(
            'This Melee account is already connected to a SWUBASE account. Disconnect it there first.',
            409,
          );
        }
        throw error;
      }
      return status(userId);
    },
    async disconnect(userId: string) {
      await database.transaction(async tx => {
        await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for('update');
        // Keep cooldown timestamps after cancellation so repeatedly canceling
        // and starting cannot turn this endpoint into an unthrottled Melee proxy.
        await tx
          .update(meleeVerification)
          .set({
            code: '',
            username: '',
            expiresAt: new Date(0),
          })
          .where(eq(meleeVerification.userId, userId));
        await tx.delete(meleeConnection).where(eq(meleeConnection.userId, userId));
      });
      return status(userId);
    },
  };
}

export const meleeConnectionService = createMeleeConnectionService(db);
