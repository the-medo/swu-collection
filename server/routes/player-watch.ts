import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../auth/auth.ts';
import { db } from '../db';
import { player as playerTable, playerWatch } from '../db/schema/tournament_weekend.ts';

const zPlayerWatchMutationBody = z
  .object({
    playerId: z.coerce.number().int().positive().optional(),
    displayName: z.string().trim().min(1).max(255).optional(),
  })
  .refine(data => data.playerId !== undefined || data.displayName !== undefined, {
    message: 'Either playerId or displayName is required.',
  });

const zPlayerWatchDeleteQuery = z.object({
  playerId: z.coerce.number().int().positive(),
});

async function resolvePlayer(data: z.infer<typeof zPlayerWatchMutationBody>) {
  if (data.playerId !== undefined) {
    const existing = (
      await db.select().from(playerTable).where(eq(playerTable.id, data.playerId)).limit(1)
    )[0];

    if (existing && !data.displayName) {
      return existing;
    }

    const displayName =
      data.displayName ?? existing?.displayName ?? `Melee Player ${data.playerId}`;

    return (
      await db
        .insert(playerTable)
        .values({
          id: data.playerId,
          displayName,
          updatedAt: sql`NOW()`,
        })
        .onConflictDoUpdate({
          target: playerTable.id,
          set: {
            displayName,
            updatedAt: sql`NOW()`,
          },
        })
        .returning()
    )[0];
  }

  if (!data.displayName) {
    return undefined;
  }

  return (
    await db
      .select()
      .from(playerTable)
      .where(sql`lower(${playerTable.displayName}) = lower(${data.displayName})`)
      .limit(1)
  )[0];
}

export const playerWatchRoute = new Hono<AuthExtension>()
  .get('/', async c => {
    const user = c.get('user');
    if (!user) {
      return c.json({ message: 'Unauthorized' }, 401);
    }

    const watches = await db
      .select({
        watch: playerWatch,
        player: playerTable,
      })
      .from(playerWatch)
      .innerJoin(playerTable, eq(playerWatch.playerId, playerTable.id))
      .where(eq(playerWatch.userId, user.id))
      .orderBy(asc(playerTable.displayName));

    return c.json({ data: watches });
  })
  .post('/', zValidator('json', zPlayerWatchMutationBody), async c => {
    const user = c.get('user');
    if (!user) {
      return c.json({ message: 'Unauthorized' }, 401);
    }

    const data = c.req.valid('json');
    const player = await resolvePlayer(data);

    if (!player) {
      return c.json({ message: 'Player not found' }, 404);
    }

    await db
      .insert(playerWatch)
      .values({
        userId: user.id,
        playerId: player.id,
      })
      .onConflictDoNothing();

    const watch = (
      await db
        .select()
        .from(playerWatch)
        .where(and(eq(playerWatch.userId, user.id), eq(playerWatch.playerId, player.id)))
        .limit(1)
    )[0];

    return c.json({ data: { watch, player } }, 201);
  })
  .delete('/', zValidator('query', zPlayerWatchDeleteQuery), async c => {
    const user = c.get('user');
    if (!user) {
      return c.json({ message: 'Unauthorized' }, 401);
    }

    const { playerId } = c.req.valid('query');

    await db
      .delete(playerWatch)
      .where(and(eq(playerWatch.userId, user.id), eq(playerWatch.playerId, playerId)));

    return c.body(null, 204);
  });
