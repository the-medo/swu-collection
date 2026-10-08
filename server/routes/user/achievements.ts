import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, asc, eq, gt, lte, ne, notExists, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { userProfile } from '../../db/schema/user_profile.ts';
import { userAchievement } from '../../db/schema/user_achievement.ts';
import { meleeConnection } from '../../db/schema/melee_connection.ts';
import { userMeleeTournaments } from '../../db/schema/user_melee_tournaments.ts';
import { tournament } from '../../db/schema/tournament.ts';
import { tournamentType } from '../../db/schema/tournament_type.ts';
import {
  DEFAULT_ACHIEVEMENT_LIMIT,
  userAchievementInputSchema,
  type UserAchievements,
} from '../../../types/UserAchievements.ts';

const params = z.object({ id: z.string().min(1).max(200) });
type Database = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
const duplicateTournament = alias(tournament, 'duplicate_achievement_tournament');

// Match current catalog identity, just as the public tournament history does.
function historyMatch(userId: string) {
  return and(
    eq(userMeleeTournaments.userId, userId),
    sql`${userMeleeTournaments.meleeId}::text = ${tournament.meleeId}`,
  );
}

const eligibleResult = and(
  eq(userMeleeTournaments.status, 4),
  gt(userMeleeTournaments.meleePlacement, 0),
  notExists(
    db
      .select({ id: duplicateTournament.id })
      .from(duplicateTournament)
      .where(
        and(
          eq(duplicateTournament.meleeId, tournament.meleeId),
          ne(duplicateTournament.id, tournament.id),
        ),
      ),
  ),
);

async function profileState(database: Database, userId: string) {
  const [owner] = await database
    .select({ limit: userProfile.achievementLimit, connection: meleeConnection.userId })
    .from(user)
    .leftJoin(userProfile, eq(userProfile.userId, user.id))
    .leftJoin(meleeConnection, eq(meleeConnection.userId, user.id))
    .where(eq(user.id, userId));
  if (!owner) return null;
  return {
    achievementLimit: owner.limit ?? DEFAULT_ACHIEVEMENT_LIMIT,
    connected: owner.connection !== null,
  };
}

async function getAchievements(userId: string): Promise<UserAchievements | null> {
  const state = await profileState(db, userId);
  if (!state) return null;
  const rows = state.connected
    ? await db
        .select({
          slot: userAchievement.slot,
          tournamentId: tournament.id,
          name: tournament.name,
          type: tournament.type,
          typeName: tournamentType.name,
          date: tournament.date,
          placement: sql<number>`${userMeleeTournaments.meleePlacement}`,
          attendance: tournament.attendance,
        })
        .from(userAchievement)
        .innerJoin(tournament, eq(tournament.id, userAchievement.tournamentId))
        .innerJoin(tournamentType, eq(tournamentType.id, tournament.type))
        .innerJoin(userMeleeTournaments, historyMatch(userId))
        .where(
          and(
            eq(userAchievement.userId, userId),
            lte(userAchievement.slot, state.achievementLimit),
            eligibleResult,
          ),
        )
        .orderBy(asc(userAchievement.slot))
    : [];
  return {
    ...state,
    achievements: rows.map(row => ({ ...row, date: row.date.toISOString().slice(0, 10) })),
  };
}

export const userAchievementsRoute = new Hono<AuthExtension>()
  .use('/:id/achievements', async (c, next) => {
    c.header('Cache-Control', 'no-store');
    await next();
  })
  .get('/:id/achievements', zValidator('param', params), async c => {
    const data = await getAchievements(c.req.valid('param').id);
    if (!data) return c.json({ message: 'User not found.' }, 404);
    return c.json({ data });
  })
  .patch(
    '/:id/achievements',
    async (c, next) => {
      const owner = c.get('user');
      if (!owner) return c.json({ message: 'Unauthorized' }, 401);
      if (owner.id !== c.req.param('id')) return c.json({ message: 'Forbidden' }, 403);
      if (c.req.header('X-Requested-With') !== 'swubase')
        return c.json({ message: 'Invalid request origin.' }, 403);
      await next();
    },
    zValidator('param', params),
    bodyLimit({ maxSize: 1024, onError: c => c.json({ message: 'Request too large.' }, 413) }),
    zValidator('json', userAchievementInputSchema),
    async c => {
      const userId = c.get('user')!.id;
      const input = c.req.valid('json');
      const failure = await db.transaction(async tx => {
        // Keep rejection paths free of writes: returning a response commits the transaction.
        // Serialize Melee unlink/refresh and slot edits while allowing other profile writers' FK checks.
        const [owner] = await tx
          .select({ id: user.id })
          .from(user)
          .where(eq(user.id, userId))
          .for('no key update');
        if (!owner) return c.json({ message: 'User not found.' }, 404);
        const state = (await profileState(tx, userId))!;
        if (input.slot > state.achievementLimit)
          return c.json({ message: 'This achievement slot is not available.' }, 409);

        if (input.tournamentId === null) {
          await tx
            .delete(userAchievement)
            .where(and(eq(userAchievement.userId, userId), eq(userAchievement.slot, input.slot)));
          return;
        }
        if (!state.connected)
          return c.json({ message: 'Connect your Melee account before adding achievements.' }, 409);
        const [result] = await tx
          .select({ id: tournament.id })
          .from(tournament)
          .innerJoin(userMeleeTournaments, historyMatch(userId))
          .where(and(eq(tournament.id, input.tournamentId), eligibleResult));
        if (!result)
          return c.json({ message: 'Choose one of your completed tournament results.' }, 400);
        const [duplicate] = await tx
          .select({ slot: userAchievement.slot })
          .from(userAchievement)
          .where(
            and(
              eq(userAchievement.userId, userId),
              eq(userAchievement.tournamentId, input.tournamentId),
              ne(userAchievement.slot, input.slot),
            ),
          );
        if (duplicate) {
          if (duplicate.slot <= state.achievementLimit)
            return c.json(
              { message: 'This tournament is already showcased in another slot.' },
              409,
            );
          // Move a hidden choice back into an available slot without discarding other choices.
          await tx
            .delete(userAchievement)
            .where(
              and(
                eq(userAchievement.userId, userId),
                eq(userAchievement.slot, duplicate.slot),
                eq(userAchievement.tournamentId, input.tournamentId),
              ),
            );
        }

        await tx.insert(userProfile).values({ userId }).onConflictDoNothing();
        await tx
          .insert(userAchievement)
          .values({ userId, slot: input.slot, tournamentId: input.tournamentId })
          .onConflictDoUpdate({
            target: [userAchievement.userId, userAchievement.slot],
            set: { tournamentId: input.tournamentId },
          });
      });
      if (failure) return failure;
      const data = await getAchievements(userId);
      if (!data) return c.json({ message: 'User not found.' }, 404);
      return c.json({ data });
    },
  );
