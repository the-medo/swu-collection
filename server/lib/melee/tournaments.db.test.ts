import { afterAll, expect, test } from 'bun:test';
import { randomInt, randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { meleeConnection } from '../../db/schema/melee_connection.ts';
import {
  userMeleeTournaments,
  userMeleeTournamentSync,
} from '../../db/schema/user_melee_tournaments.ts';
import { tournament } from '../../db/schema/tournament.ts';
import { tournamentDeck } from '../../db/schema/tournament_deck.ts';
import { deck } from '../../db/schema/deck.ts';
import { createMeleeTournamentService } from './tournaments.ts';
import { createMeleeConnectionService } from './connection.ts';
import type { MeleeResult } from './results.ts';

const databaseTest = test.skipIf(process.env.SWUBASE_MELEE_DB_TEST !== '1');
if (process.env.SWUBASE_MELEE_DB_TEST === '1') {
  const target = new URL(process.env.DATABASE_URL!);
  if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_'))
    throw new Error('Tests require the isolated worktree database.');
}
const users: string[] = [];
const tournaments: string[] = [];
const decks: string[] = [];
afterAll(async () => {
  if (tournaments.length) {
    await db.delete(tournamentDeck).where(inArray(tournamentDeck.tournamentId, tournaments));
    await db.delete(tournament).where(inArray(tournament.id, tournaments));
  }
  if (decks.length) await db.delete(deck).where(inArray(deck.id, decks));
  if (users.length) await db.delete(user).where(inArray(user.id, users));
});
async function owner() {
  const id = `melee-history-test-${randomUUID()}`;
  await db.insert(user).values({
    id,
    name: 'Test',
    displayName: id,
    currency: 'USD',
    email: `${id}@example.invalid`,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  users.push(id);
  await db
    .insert(meleeConnection)
    .values({ userId: id, meleeUserId: randomUUID(), username: 'Example', displayName: 'Example' });
  return id;
}
const result = (overrides: Partial<MeleeResult> = {}): MeleeResult => ({
  UserName: 'Example',
  TournamentId: randomInt(1_800_000_000, 2_000_000_000),
  TournamentName: 'Melee event',
  Game: 'StarWarsUnlimited',
  TournamentStatus: 4,
  TournamentStartDate: '2026-01-02T08:00:00Z',
  ParticipatingCount: 100,
  Rank: 8,
  Format: null,
  Record: '5-1-0',
  DecklistId: 0,
  DecklistName: 'Decklist',
  ...overrides,
});
async function localTournament(
  userId: string,
  meleeId: number,
  overrides: Partial<
    Pick<typeof tournament.$inferInsert, 'type' | 'attendance' | 'days' | 'dayTwoPlayerCount'>
  > = {},
) {
  const [row] = await db
    .insert(tournament)
    .values({
      userId,
      type: 'pq',
      location: 'Test',
      continent: 'Europe',
      name: 'SWUBASE event',
      attendance: 128,
      meleeId: String(meleeId),
      format: 1,
      days: 1,
      date: new Date('2026-01-02'),
      ...overrides,
    })
    .returning();
  tournaments.push(row!.id);
  return row!;
}

databaseTest(
  'imports only catalog events, preserves snapshots on failure and matches historical deck names',
  async () => {
    const userId = await owner();
    const first = result();
    const unranked = result({ Rank: 0 });
    const unmatched = result();
    const local = await localTournament(userId, first.TournamentId);
    await localTournament(userId, unranked.TournamentId);
    let rows = [first, unranked, unmatched];
    let failure = false;
    let time = Date.now();
    const service = createMeleeTournamentService(
      db,
      async () => {
        if (failure) throw new Error('upstream unavailable');
        return rows;
      },
      () => new Date(time),
    );
    const refreshed = await service.refresh(userId);
    expect(refreshed.tournaments).toHaveLength(2);
    expect(
      refreshed.tournaments.find(row => row.meleeId !== first.TournamentId)!.placement,
    ).toBeNull();
    expect(refreshed.stats.pqOpenTotal).toBe(2);
    const stored = await db
      .select()
      .from(userMeleeTournaments)
      .where(eq(userMeleeTournaments.userId, userId));
    expect(stored).toHaveLength(2);
    expect(
      stored.every(row => row.tournamentId !== null && row.meleeId !== unmatched.TournamentId),
    ).toBe(true);
    await expect(service.refresh(userId)).rejects.toThrow('wait a minute');
    const [savedDeck] = await db
      .insert(deck)
      .values({ userId, name: 'Private deck', format: 1, public: 0 })
      .returning();
    decks.push(savedDeck!.id);
    await db.insert(tournamentDeck).values({
      tournamentId: local.id,
      deckId: savedDeck!.id,
      placement: 8,
      topRelativeToPlayerCount: true,
      recordWin: 5,
      recordLose: 1,
      recordDraw: 0,
      points: 15,
      meleePlayerUsername: 'Martin Mederly',
    });
    let matched = (await service.get(userId)).tournaments.find(
      row => row.meleeId === first.TournamentId,
    )!;
    expect(matched.name).toBe('SWUBASE event');
    expect(matched.attendance).toBe(128);
    expect(matched.topEight).toBe(true);
    expect(matched.deck).toBeNull();
    await db.update(deck).set({ public: 1 }).where(eq(deck.id, savedDeck!.id));
    matched = (await service.get(userId)).tournaments.find(
      row => row.meleeId === first.TournamentId,
    )!;
    expect(matched.deck?.id).toBe(savedDeck!.id);
    time += 61_000;
    failure = true;
    await expect(service.refresh(userId)).rejects.toThrow('upstream unavailable');
    expect((await service.get(userId)).lastRefreshedAt).toBe(refreshed.lastRefreshedAt);
    expect((await service.get(userId)).tournaments).toHaveLength(2);
    failure = false;
    time += 61_000;
    rows = [first];
    await service.refresh(userId);
    const [persisted] = await db
      .select()
      .from(userMeleeTournaments)
      .where(eq(userMeleeTournaments.userId, userId));
    expect(persisted!.tournamentId).toBe(local.id);
    rows = [];
    time += 61_000;
    expect((await service.refresh(userId)).tournaments).toEqual([]);
  },
);

databaseTest(
  'concurrent refresh only fetches once and disconnect/reconnect prevents stale writes',
  async () => {
    const userId = await owner();
    let finish!: () => void;
    let started!: () => void;
    const fetching = new Promise<void>(resolve => {
      started = resolve;
    });
    const pending = new Promise<void>(resolve => {
      finish = resolve;
    });
    let calls = 0;
    const service = createMeleeTournamentService(db, async () => {
      calls++;
      started();
      await pending;
      return [result()];
    });
    const refresh = service.refresh(userId).catch(error => error as Error);
    await fetching;
    await expect(service.refresh(userId)).rejects.toThrow('wait a minute');
    expect(calls).toBe(1);
    await createMeleeConnectionService(db).disconnect(userId);
    expect(
      await db
        .select()
        .from(userMeleeTournamentSync)
        .where(eq(userMeleeTournamentSync.userId, userId)),
    ).toHaveLength(0);
    await db
      .insert(meleeConnection)
      .values({ userId, meleeUserId: randomUUID(), username: 'Other', displayName: 'Other' });
    finish();
    const response = await refresh;
    expect(response).toBeInstanceOf(Error);
    expect((response as Error).message).toContain('connection changed');
    expect((await service.get(userId)).tournaments).toEqual([]);
  },
);

databaseTest(
  'disconnect cascades saved results and unknown users/connections are rejected',
  async () => {
    const userId = await owner();
    const entry = result();
    await localTournament(userId, entry.TournamentId);
    const service = createMeleeTournamentService(db, async () => [entry]);
    expect((await service.refresh(userId)).tournaments).toHaveLength(1);
    await createMeleeConnectionService(db).disconnect(userId);
    expect(
      await db.select().from(userMeleeTournaments).where(eq(userMeleeTournaments.userId, userId)),
    ).toHaveLength(0);
    expect((await service.get(userId)).connected).toBe(false);
    await expect(service.refresh(userId)).rejects.toThrow('Connect your Melee account');
    await expect(service.get('nonexistent-profile-user')).rejects.toThrow('User not found');
  },
);

databaseTest(
  'legacy unmatched rows are hidden and removed; a newly cataloged event requires refresh',
  async () => {
    const userId = await owner();
    const entry = result();
    await db.insert(userMeleeTournaments).values({
      userId,
      meleeId: entry.TournamentId,
      name: entry.TournamentName,
      date: new Date(entry.TournamentStartDate),
      attendance: entry.ParticipatingCount,
      meleePlacement: entry.Rank,
      status: entry.TournamentStatus,
      refreshedAt: new Date(),
    });
    let time = Date.now();
    const service = createMeleeTournamentService(
      db,
      async () => [entry],
      () => new Date(time),
    );
    expect((await service.get(userId)).tournaments).toEqual([]);
    expect((await service.refresh(userId)).tournaments).toEqual([]);
    expect(
      await db.select().from(userMeleeTournaments).where(eq(userMeleeTournaments.userId, userId)),
    ).toHaveLength(0);
    await localTournament(userId, entry.TournamentId);
    expect((await service.get(userId)).tournaments).toEqual([]);
    time += 61_000;
    expect((await service.refresh(userId)).tournaments).toHaveLength(1);
  },
);

databaseTest(
  'major stats use catalog attendance and ambiguous catalog matches are excluded',
  async () => {
    const userId = await owner();
    const entries = [result({ Rank: 9 }), result({ Rank: 18 })];
    await localTournament(userId, entries[0]!.TournamentId, {
      type: 'rq',
      attendance: 560,
      days: 2,
      dayTwoPlayerCount: 64,
    });
    await localTournament(userId, entries[1]!.TournamentId, {
      type: 'rq',
      attendance: 676,
      days: 3,
      dayTwoPlayerCount: 128,
    });
    let time = Date.now();
    const service = createMeleeTournamentService(
      db,
      async () => entries,
      () => new Date(time),
    );
    const initial = await service.refresh(userId);
    expect(initial.stats.dayTwos).toBe(2);
    expect(
      initial.stats.bestMajorFinishes.map(({ placement, attendance }) => [placement, attendance]),
    ).toEqual([
      [9, 560],
      [18, 676],
    ]);
    await localTournament(userId, entries[0]!.TournamentId);
    const ambiguous = await service.get(userId);
    expect(ambiguous.tournaments).toHaveLength(1);
    expect(ambiguous.stats.bestMajorFinishes[0]!.placement).toBe(18);
    time += 61_000;
    await service.refresh(userId);
    expect(
      await db.select().from(userMeleeTournaments).where(eq(userMeleeTournaments.userId, userId)),
    ).toHaveLength(1);
  },
);
