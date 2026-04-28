import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, asc, eq, ilike, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../auth/auth.ts';
import { db } from '../db';
import { player as playerTable, playerWatch } from '../db/schema/tournament_weekend.ts';
import { createLiveWatchedPlayersPatchEvent } from '../lib/live-tournaments/liveTournamentHomeCache.ts';
import { getLiveTournamentWeekend } from '../lib/live-tournaments/tournamentWeekendMaintenance.ts';

const zPlayerWatchMutationBody = z.object({
  displayName: z.string().trim().min(1).max(255),
});

const zPlayerWatchDeleteQuery = z.object({
  displayName: z.string().trim().min(1).max(255),
});

const zPlayerSearchQuery = z.object({
  search: z.string().trim().max(255).default(''),
});

const playerNotFoundMessage =
  'Player not found in our system yet. Please use the exact Melee display name. If the player still does not appear, they need to play their first PQ since this feature was added.';
const playerSearchLimit = 10;

async function resolvePlayer(displayName: string) {
  return (
    await db
      .select()
      .from(playerTable)
      .where(sql`lower(${playerTable.displayName}) = lower(${displayName})`)
      .limit(1)
  )[0];
}

export const playerWatchRoute = new Hono<AuthExtension>()
  .get('/players', zValidator('query', zPlayerSearchQuery), async c => {
    const { search } = c.req.valid('query');

    let query = db
      .select({
        displayName: playerTable.displayName,
      })
      .from(playerTable)
      .$dynamic();

    if (search) {
      query = query.where(ilike(playerTable.displayName, `%${search}%`));
    }

    const players = await query.orderBy(asc(playerTable.displayName)).limit(playerSearchLimit);

    return c.json({ data: players });
  })
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
      .innerJoin(playerTable, eq(playerWatch.playerDisplayName, playerTable.displayName))
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
    const player = await resolvePlayer(data.displayName);

    if (!player) {
      return c.json({ message: playerNotFoundMessage }, 404);
    }

    await db
      .insert(playerWatch)
      .values({
        userId: user.id,
        playerDisplayName: player.displayName,
      })
      .onConflictDoNothing();

    const watch = (
      await db
        .select()
        .from(playerWatch)
        .where(
          and(
            eq(playerWatch.userId, user.id),
            eq(playerWatch.playerDisplayName, player.displayName),
          ),
        )
        .limit(1)
    )[0];

    const liveWeekend = await getLiveTournamentWeekend();
    if (liveWeekend) {
      await createLiveWatchedPlayersPatchEvent(liveWeekend.id, user.id);
    }

    return c.json({ data: { watch, player } }, 201);
  })
  .delete('/', zValidator('query', zPlayerWatchDeleteQuery), async c => {
    const user = c.get('user');
    if (!user) {
      return c.json({ message: 'Unauthorized' }, 401);
    }

    const { displayName } = c.req.valid('query');

    await db
      .delete(playerWatch)
      .where(and(eq(playerWatch.userId, user.id), eq(playerWatch.playerDisplayName, displayName)));

    const liveWeekend = await getLiveTournamentWeekend();
    if (liveWeekend) {
      await createLiveWatchedPlayersPatchEvent(liveWeekend.id, user.id);
    }

    return c.body(null, 204);
  });
