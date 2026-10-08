import { afterAll, expect, test } from 'bun:test';
import { randomInt, randomUUID } from 'node:crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import type { UserAchievementInput, UserAchievements } from '../../../types/UserAchievements.ts';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { userProfile } from '../../db/schema/user_profile.ts';
import { userAchievement } from '../../db/schema/user_achievement.ts';
import { meleeConnection } from '../../db/schema/melee_connection.ts';
import { userMeleeTournaments } from '../../db/schema/user_melee_tournaments.ts';
import { tournament } from '../../db/schema/tournament.ts';
import { createMeleeTournamentService } from '../melee/tournaments.ts';
import { createMeleeConnectionService } from '../melee/connection.ts';
import { userAchievementsRoute } from '../../routes/user/achievements.ts';
import { updateUserProfileFavorites } from './service.ts';

const databaseTest = test.skipIf(process.env.USER_ACHIEVEMENTS_DB_TEST !== '1');
if (process.env.USER_ACHIEVEMENTS_DB_TEST === '1') {
  const target = new URL(process.env.DATABASE_URL!);
  if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_'))
    throw new Error('Select an isolated worktree database.');
}
const users: string[] = [];
const tournamentIds: string[] = [];
const app = new Hono<AuthExtension>()
  .use('*', async (c, next) => {
    const viewer = c.req.header('X-Test-User');
    c.set(
      'user',
      viewer ? ({ id: viewer } as NonNullable<AuthExtension['Variables']['user']>) : null,
    );
    await next();
  })
  .route('/', userAchievementsRoute);

async function readAchievements(response: Response): Promise<UserAchievements> {
  if (!response.ok) {
    const message = response.headers.get('Content-Type')?.includes('application/json')
      ? (await response.json()).message
      : await response.text();
    throw Object.assign(new Error(message), { status: response.status });
  }
  return (await response.json()).data;
}

async function getAchievements(userId: string) {
  return readAchievements(await app.request(`/${userId}/achievements`));
}

async function updateAchievement(userId: string, input: UserAchievementInput) {
  return readAchievements(
    await app.request(`/${userId}/achievements`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'swubase',
        'X-Test-User': userId,
      },
      body: JSON.stringify(input),
    }),
  );
}
afterAll(async () => {
  if (tournamentIds.length)
    await db.delete(tournament).where(inArray(tournament.id, tournamentIds));
  if (users.length) await db.delete(user).where(inArray(user.id, users));
});

async function owner(connected = true) {
  const id = `achievement-test-${randomUUID()}`;
  await db.insert(user).values({
    id,
    name: id,
    displayName: id,
    email: `${id}@invalid.local`,
    emailVerified: false,
    currency: 'USD',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  users.push(id);
  if (connected)
    await db.insert(meleeConnection).values({
      userId: id,
      meleeUserId: randomUUID(),
      username: id,
      displayName: id,
    });
  return id;
}

async function result(userId: string, placement: number | null = 8, status = 4) {
  const meleeId = randomInt(1_800_000_000, 2_000_000_000);
  const [event] = await db
    .insert(tournament)
    .values({
      userId,
      type: 'sq',
      location: 'Test',
      continent: 'Europe',
      name: `Achievement event ${meleeId}`,
      attendance: 256,
      meleeId: String(meleeId),
      format: 1,
      days: 2,
      date: new Date('2026-01-02'),
    })
    .returning();
  tournamentIds.push(event!.id);
  const history = {
    userId,
    meleeId,
    tournamentId: event!.id,
    meleePlacement: placement,
    name: 'Melee name',
    attendance: 255,
    date: new Date('2026-01-02'),
    status,
    refreshedAt: new Date(),
  };
  await db.insert(userMeleeTournaments).values(history);
  return { event: event!, history };
}

databaseTest(
  'request guards reject unauthorized and invalid writes without changing a saved result',
  async () => {
    const id = await owner();
    const { event } = await result(id);
    const input = { slot: 1, tournamentId: event.id };
    await updateAchievement(id, input);
    const headers = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'swubase',
      'X-Test-User': id,
    };
    const patch = (body: string, requestHeaders: Record<string, string> = headers) =>
      app.request(`/${id}/achievements`, { method: 'PATCH', headers: requestHeaders, body });

    for (const tournamentId of [event.id, null]) {
      const body = JSON.stringify({ slot: 1, tournamentId });
      expect(
        (await patch(body, { 'Content-Type': 'application/json', 'X-Requested-With': 'swubase' }))
          .status,
      ).toBe(401);
      expect((await patch(body, { ...headers, 'X-Test-User': 'other-user' })).status).toBe(403);
    }
    expect(
      (
        await patch(JSON.stringify(input), {
          'Content-Type': 'application/json',
          'X-Test-User': id,
        })
      ).status,
    ).toBe(403);
    for (const body of [
      {},
      ...[0, -1, 1.5, '1', 2_147_483_648].map(slot => ({ ...input, slot })),
      { slot: 1 },
      { ...input, tournamentId: 'invalid' },
      { ...input, achievementLimit: 99 },
      { ...input, achievement_limit: 99 },
      { ...input, placement: 1 },
      { ...input, userId: 'other-user' },
    ])
      expect((await patch(JSON.stringify(body))).status).toBe(400);
    expect((await patch('{')).status).toBe(400);
    const oversized = JSON.stringify({ slot: 1, tournamentId: 'x'.repeat(2000) });
    expect(
      (await patch(oversized, { ...headers, 'Content-Length': String(oversized.length) })).status,
    ).toBe(413);
    expect((await app.request(`/${'x'.repeat(201)}/achievements`)).status).toBe(400);
    const response = await app.request(`/${id}/achievements`);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect((await app.request(`/${id}/collection`)).headers.get('Cache-Control')).toBeNull();
    expect(await db.select().from(userAchievement).where(eq(userAchievement.userId, id))).toEqual([
      { userId: id, ...input },
    ]);
  },
);

databaseTest(
  'defaults, result ownership, completion, slot limits and protected profile entitlements',
  async () => {
    const id = await owner(false);
    expect(await getAchievements(id)).toEqual({
      achievementLimit: 1,
      connected: false,
      achievements: [],
    });
    await expect(
      updateAchievement(id, { slot: 1, tournamentId: randomUUID() }),
    ).rejects.toMatchObject({
      message: 'Connect your Melee account before adding achievements.',
      status: 409,
    });
    await db
      .insert(meleeConnection)
      .values({ userId: id, meleeUserId: randomUUID(), username: id, displayName: id });
    const valid = await result(id);
    const unranked = await result(id, null);
    const unfinished = await result(id, 1, 2);
    const other = await result(await owner());
    for (const eventId of [unranked.event.id, unfinished.event.id, other.event.id, randomUUID()])
      await expect(updateAchievement(id, { slot: 1, tournamentId: eventId })).rejects.toMatchObject(
        {
          message: 'Choose one of your completed tournament results.',
          status: 400,
        },
      );
    await expect(
      updateAchievement(id, { slot: 2, tournamentId: valid.event.id }),
    ).rejects.toMatchObject({ message: 'This achievement slot is not available.', status: 409 });
    const saved = await updateAchievement(id, { slot: 1, tournamentId: valid.event.id });
    expect(saved.achievements).toEqual([
      {
        slot: 1,
        tournamentId: valid.event.id,
        name: valid.event.name,
        type: 'sq',
        typeName: 'Sector Qualifier',
        date: '2026-01-02',
        placement: 8,
        attendance: 256,
      },
    ]);
    const [profile] = await db.select().from(userProfile).where(eq(userProfile.userId, id));
    expect(profile!.achievementLimit).toBe(1);
    await updateUserProfileFavorites(id, { favoriteAspects: [] });
    expect((await getAchievements(id)).achievements).toHaveLength(1);
    await expect(
      db
        .update(userProfile)
        .set({ achievementLimit: -1 })
        .where(eq(userProfile.userId, id))
        .execute(),
    ).rejects.toThrow();
    await expect(
      db
        .insert(userAchievement)
        .values({ userId: id, slot: 0, tournamentId: valid.event.id })
        .execute(),
    ).rejects.toThrow();
    expect((await updateAchievement(id, { slot: 1, tournamentId: null })).achievements).toEqual([]);
  },
);

databaseTest(
  'extra slots save in order and concurrent requests cannot showcase one result twice',
  async () => {
    const id = await owner();
    await db.insert(userProfile).values({ userId: id, achievementLimit: 3 });
    const first = await result(id, 1);
    const second = await result(id, 12);
    const writes = await Promise.allSettled([
      updateAchievement(id, { slot: 1, tournamentId: first.event.id }),
      updateAchievement(id, { slot: 2, tournamentId: first.event.id }),
    ]);
    expect(writes.filter(write => write.status === 'fulfilled')).toHaveLength(1);
    const rejected = writes.find(write => write.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason.message).toBe('This tournament is already showcased in another slot.');
    expect(rejected.reason.status).toBe(409);
    const firstSlot = (await getAchievements(id)).achievements[0]!.slot;
    const secondSlot = firstSlot === 1 ? 2 : 1;
    await Promise.all([
      updateAchievement(id, { slot: firstSlot, tournamentId: first.event.id }),
      updateAchievement(id, { slot: secondSlot, tournamentId: second.event.id }),
    ]);
    expect((await getAchievements(id)).achievements.map(row => row.slot)).toEqual([1, 2]);
    expect((await getAchievements(id)).achievementLimit).toBe(3);
    await updateAchievement(id, { slot: firstSlot, tournamentId: null });
    expect(
      (await updateAchievement(id, { slot: secondSlot, tournamentId: first.event.id }))
        .achievements[0]!.tournamentId,
    ).toBe(first.event.id);
  },
);

databaseTest(
  'a result in a hidden slot can move into an available slot after a limit reduction',
  async () => {
    const id = await owner();
    await db.insert(userProfile).values({ userId: id, achievementLimit: 3 });
    const first = await result(id, 1);
    const second = await result(id, 4);
    await updateAchievement(id, { slot: 2, tournamentId: first.event.id });
    await updateAchievement(id, { slot: 3, tournamentId: second.event.id });
    await db.update(userProfile).set({ achievementLimit: 1 }).where(eq(userProfile.userId, id));
    expect((await getAchievements(id)).achievements).toEqual([]);
    await expect(updateAchievement(id, { slot: 2, tournamentId: null })).rejects.toMatchObject({
      message: 'This achievement slot is not available.',
      status: 409,
    });
    const moved = await updateAchievement(id, { slot: 1, tournamentId: first.event.id });
    expect(moved.achievements.map(row => row.tournamentId)).toEqual([first.event.id]);
    // Moving this result preserves other choices if those slots become available again.
    await db.update(userProfile).set({ achievementLimit: 3 }).where(eq(userProfile.userId, id));
    expect((await getAchievements(id)).achievements.map(row => row.slot)).toEqual([1, 3]);
  },
);

databaseTest(
  'achievement saves coexist with the owner key-share lock used by other profile edits',
  async () => {
    const id = await owner();
    const { event } = await result(id);
    let save: Promise<UserAchievements> | undefined;
    let blockedSave: Promise<UserAchievements> | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await db.transaction(async tx => {
        // Header writes and new profile rows hold this lock to check their owner FK.
        await tx.select({ id: user.id }).from(user).where(eq(user.id, id)).for('key share');
        save = updateAchievement(id, { slot: 1, tournamentId: event.id });
        const saved = await Promise.race([
          save,
          new Promise<never>((_, reject) => {
            timeout = setTimeout(
              () =>
                reject(
                  new Error('Achievement save timed out while the owner had a key-share lock.'),
                ),
              2000,
            );
          }),
        ]);
        clearTimeout(timeout);
        expect(saved.achievements[0]!.tournamentId).toBe(event.id);
        await updateUserProfileFavorites(id, { favoriteAspects: [] });
        expect((await getAchievements(id)).achievements).toHaveLength(1);
      });
      await db.transaction(async tx => {
        // Melee linking, unlinking and refresh use this stronger lock and must still serialize.
        await tx.select({ id: user.id }).from(user).where(eq(user.id, id)).for('update');
        const [holder] = await tx.execute<{ pid: number }>(sql`SELECT pg_backend_pid() AS pid`);
        blockedSave = updateAchievement(id, { slot: 1, tournamentId: event.id });
        let blocked = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          const waiting = await db.execute(sql`
            SELECT 1 FROM pg_stat_activity
            WHERE ${holder!.pid} = ANY(pg_blocking_pids(pid)) LIMIT 1
          `);
          if (waiting.length) {
            blocked = true;
            break;
          }
          await Bun.sleep(10);
        }
        expect(blocked).toBe(true);
      });
      expect((await blockedSave!).achievements[0]!.tournamentId).toBe(event.id);
    } finally {
      clearTimeout(timeout);
      await save?.catch(() => {});
      await blockedSave?.catch(() => {});
    }
  },
);

databaseTest(
  'showcases survive history replacement, reflect corrected results, and clear on unlink',
  async () => {
    const id = await owner();
    const { event, history } = await result(id);
    await updateAchievement(id, { slot: 1, tournamentId: event.id });
    const refresh = createMeleeTournamentService(db, async () => [
      {
        UserName: id,
        TournamentId: history.meleeId,
        TournamentName: 'Melee name',
        Game: 'StarWarsUnlimited',
        TournamentStatus: 4,
        TournamentStartDate: '2026-01-02T08:00:00Z',
        ParticipatingCount: 255,
        Rank: 4,
        Format: null,
        Record: '7-1-0',
        DecklistId: 0,
        DecklistName: null,
      },
    ]);
    await refresh.refresh(id);
    expect((await getAchievements(id)).achievements[0]!.placement).toBe(4);
    await db
      .update(userMeleeTournaments)
      .set({ status: 2 })
      .where(eq(userMeleeTournaments.userId, id));
    expect((await getAchievements(id)).achievements).toEqual([]);
    await db
      .update(userMeleeTournaments)
      .set({ status: 4 })
      .where(eq(userMeleeTournaments.userId, id));
    expect((await getAchievements(id)).achievements).toHaveLength(1);
    await createMeleeConnectionService(db).disconnect(id);
    expect(
      await db.select().from(userAchievement).where(eq(userAchievement.userId, id)),
    ).toHaveLength(0);
    expect(await getAchievements(id)).toEqual({
      achievementLimit: 1,
      connected: false,
      achievements: [],
    });
    await db
      .insert(meleeConnection)
      .values({ userId: id, meleeUserId: randomUUID(), username: id, displayName: id });
    await db.insert(userMeleeTournaments).values(history);
    expect((await getAchievements(id)).achievements).toEqual([]);
  },
);

databaseTest(
  'ambiguous catalog events are hidden/rejected and tournament/user deletion removes showcases',
  async () => {
    const id = await owner();
    const { event } = await result(id);
    await updateAchievement(id, { slot: 1, tournamentId: event.id });
    const duplicateId = randomUUID();
    await db.insert(tournament).values({ ...event, id: duplicateId });
    tournamentIds.push(duplicateId);
    expect((await getAchievements(id)).achievements).toEqual([]);
    await expect(updateAchievement(id, { slot: 1, tournamentId: event.id })).rejects.toMatchObject({
      message: 'Choose one of your completed tournament results.',
      status: 400,
    });
    await db.delete(tournament).where(eq(tournament.id, duplicateId));
    expect((await getAchievements(id)).achievements).toHaveLength(1);
    await db.delete(tournament).where(eq(tournament.id, event.id));
    expect(
      await db.select().from(userAchievement).where(eq(userAchievement.userId, id)),
    ).toHaveLength(0);
    const next = await result(id);
    await updateAchievement(id, { slot: 1, tournamentId: next.event.id });
    // Move fixture ownership so deleting this player tests their cascades, not the catalog owner FK.
    await db.update(tournament).set({ userId: users[0]! }).where(eq(tournament.id, next.event.id));
    await db.delete(user).where(eq(user.id, id));
    expect(
      await db.select().from(userAchievement).where(eq(userAchievement.userId, id)),
    ).toHaveLength(0);
    await expect(getAchievements(id)).rejects.toMatchObject({
      message: 'User not found.',
      status: 404,
    });
    await expect(
      updateAchievement(id, { slot: 1, tournamentId: next.event.id }),
    ).rejects.toMatchObject({ message: 'User not found.', status: 404 });
  },
);

databaseTest(
  'contributor sanitization includes showcases in the Melee foreign-key group',
  async () => {
    const id = await owner();
    const { event } = await result(id);
    await updateAchievement(id, { slot: 1, tournamentId: event.id });
    const sanitizer = await Bun.file(
      new URL('../../../scripts/remote-dev/sql/001-core-data.sql', import.meta.url),
    ).text();
    const block = sanitizer.match(/DO \$user_achievements\$[\s\S]*?\$user_achievements\$;/)![0];
    const rollback = new Error('Rollback sanitizer smoke check');
    try {
      await db.transaction(async tx => {
        await tx.execute(sql.raw(block));
        expect(await tx.select().from(userAchievement)).toHaveLength(0);
        expect(await tx.select().from(meleeConnection)).toHaveLength(0);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
    expect(
      await db
        .select()
        .from(userAchievement)
        .where(and(eq(userAchievement.userId, id), eq(userAchievement.slot, 1))),
    ).toHaveLength(1);
  },
);
