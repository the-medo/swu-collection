import { beforeAll, afterAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { playableFixture } from '../testing/ai/playable-fixture.ts';
import { CrossfireAiReleases } from '../../server/lib/crossfire/aiReleases.ts';
import { CrossfireAiGames } from '../../server/lib/crossfire/aiGames.ts';
import { CrossfireHistory } from '../../server/lib/crossfire/history.ts';
import { CrossfireConnections } from '../../server/lib/crossfire/connections.ts';
import { CrossfireLobbies } from '../../server/lib/crossfire/lobbies.ts';
import { GameWorker } from '../worker/games.ts';
import { PostgresGameStore } from '../storage/postgres.ts';
import { Projector } from '../projection/projector.ts';
import { CommandBuilder } from '../ai/full-game/choices.ts';
import { AiGameRunner } from '../ai/live/runner.ts';
import { publishStatistics } from '../statistics/publish.ts';
import { retainAiReplays } from '../ai/live/retention.ts';
import { encodeArchive } from '../history/archive.ts';
import { ids } from '../testing/helpers.ts';
import { versions } from '../engine/model.ts';

const url = process.env.CROSSFIRE_TEST_DATABASE_URL;
if (!url || new URL(url).hostname !== '127.0.0.1' || !new URL(url).pathname.startsWith('/swubase_'))
  throw new Error('Isolated worktree DB required');
const sql = postgres(url, { max: 5, onnotice: () => {} }),
  f = playableFixture();
const people = [0, 1].map(() => ({
  userId: `bot-play-${randomUUID()}`,
  sessionId: randomUUID(),
  deckId: randomUUID(),
}));
const p = people[0]!,
  stranger = people[1]!;
const principal = (person: typeof p) => ({ userId: person.userId, sessionId: person.sessionId });
let decisions = 0;
const releases = new CrossfireAiReleases(sql, null, {
  async load() {
    return { parameters: 1 };
  },
  async choose(release, _target, _deck, observation) {
    decisions++;
    expect(Object.keys(observation as object).sort()).toEqual(['candidates', 'context']);
    return { action: 0, value: 0, releaseId: release.id, artifact: release.artifact.sha256 };
  },
});
const catalog = await Bun.file(
  new URL('../../server/db/json/card-list.json', import.meta.url),
).json();
const games = new CrossfireAiGames(sql, catalog, releases),
  history = new CrossfireHistory(sql),
  connections = new CrossfireConnections(sql, 'http://localhost:5173'),
  lobbies = new CrossfireLobbies(sql, catalog),
  store = new PostgresGameStore(sql);
let worker = new GameWorker(store);
const gameIds: string[] = [],
  lobbyIds: string[] = [];
let previous: string | null = null;
const input = () => ({
  requestId: randomUUID(),
  deckId: p.deckId,
  leaderCardId: f.release.leader.cardId,
  opponentDeck: 'krennic',
  releaseId: f.release.id,
});
beforeAll(async () => {
  for (const person of people) {
    await sql`INSERT INTO "user"(id,name,email,email_verified,created_at,updated_at,display_name,currency,role) VALUES(${person.userId},'AI play fixture',${person.userId + '@invalid.local'},false,now(),now(),${person.userId},'USD','crossfire')`;
    await sql`INSERT INTO session(id,token,expires_at,user_id,created_at,updated_at) VALUES(${person.sessionId},${randomUUID()},now()+interval '1 hour',${person.userId},now(),now())`;
    await sql`INSERT INTO deck(id,user_id,format,leader_card_id_1,base_card_id) VALUES(${person.deckId},${person.userId},1,${ids.leader},${ids.base})`;
    await sql`INSERT INTO deck_card(deck_id,card_id,board,quantity) VALUES(${person.deckId},${ids.marine},1,12)`;
  }
  const selection = await releases.importRelease(f.release, f.weights);
  previous = (await releases.preview(selection)).current;
  await releases.activate({ ...selection, versions, expectedActive: previous }, p.userId);
});
afterAll(async () => {
  await worker.stop();
  await sql`DELETE FROM play.lobbies WHERE id=ANY(${lobbyIds})`;
  await sql`DELETE FROM play.games WHERE id=ANY(${gameIds})`;
  if (previous)
    await sql`UPDATE play.ai_active SET release_id=${previous} WHERE release_id=${f.release.id}`;
  else await sql`DELETE FROM play.ai_active WHERE release_id=${f.release.id}`;
  await sql`DELETE FROM play.ai_activations WHERE release_id=${f.release.id}`;
  await sql`DELETE FROM play.ai_releases WHERE id=${f.release.id}`;
  await sql`DELETE FROM deck_card WHERE deck_id=ANY(${people.map(p => p.deckId)})`;
  await sql`DELETE FROM deck WHERE id=ANY(${people.map(p => p.deckId)})`;
  await sql`DELETE FROM session WHERE user_id=ANY(${people.map(p => p.userId)})`;
  await sql`DELETE FROM "user" WHERE id=ANY(${people.map(p => p.userId)})`;
  await sql.end();
});
async function create(body = input()) {
  const g = await games.create(principal(p), body);
  gameIds.push(g.gameId);
  lobbyIds.push(g.id);
  return g;
}
async function finish(gameId: string) {
  const b = await worker.acquire(gameId);
  await b.run(host =>
    host.submit('p1', randomUUID(), {
      type: 'concede',
      gameId,
      playerId: 'p1',
      expectedRevision: host.state.revision,
    }),
  );
  b.release();
  await worker.stop();
  worker = new GameWorker(store);
  const recording = await store.readHistory(gameId);
  await store.publishArchive(gameId, await encodeArchive(recording));
  expect(await publishStatistics(sql, recording)).toBe(false);
  expect(await publishStatistics(sql, recording)).toBe(false);
  await retainAiReplays(sql, p.userId);
}
test('admission is authenticated, idempotent, model-pinned and never creates a bot account', async () => {
  const roster = await games.list(principal(p));
  expect(roster.replayLimit).toBe(5);
  expect(roster.data.some(d => d.releaseId === f.release.id)).toBe(true);
  await expect(games.create({ ...principal(p), sessionId: 'missing' }, input())).rejects.toThrow(
    'unauthenticated',
  );
  await expect(games.create(principal(p), { ...input(), deckId: randomUUID() })).rejects.toThrow(
    'deck-unavailable',
  );
  const body = input();
  const [a, b] = await Promise.all([
    games.create(principal(p), body),
    games.create(principal(p), body),
  ]);
  expect(a).toEqual(b);
  gameIds.push(a.gameId);
  lobbyIds.push(a.id);
  await expect(games.create(principal(p), { ...body, opponentDeck: 'vader' })).rejects.toThrow(
    'conflict',
  );
  const seats =
    await sql`SELECT seat,user_id,session_id FROM play.participants WHERE lobby_id=${a.id} ORDER BY seat`;
  expect(seats[1]).toMatchObject({ seat: 'p2', user_id: null, session_id: 'ai' });
  expect((await lobbies.get(principal(p), a.id))?.ai?.releaseId).toBe(f.release.id);
  await expect(
    connections.issue(principal(stranger), a.id, 'player', 'http://localhost:5173'),
  ).rejects.toThrow();
  await expect(
    connections.issue(principal(stranger), a.id, 'spectator', 'http://localhost:5173'),
  ).rejects.toThrow();
});
test('the bot makes durable legal choices, recovers, and ignores changed active selection', async () => {
  const gameId = gameIds[0]!;
  const changes: string[] = [];
  const runner = new AiGameRunner(
    sql,
    worker,
    releases,
    () => [gameId],
    async id => {
      changes.push(id);
    },
  );
  const [saved] = await sql`SELECT pin FROM play.ai_games WHERE game_id=${gameId}`;
  // An active selection is not consulted after admission.
  await sql`DELETE FROM play.ai_active WHERE release_id=${f.release.id}`;
  for (let n = 0; n < 12 && !changes.length; n++) {
    const b = await worker.acquire(gameId);
    const state = await b.run(async host => host.state);
    if (state.execution.decision?.playerId === 'p2') {
      b.release();
      await runner.move(gameId, saved!.pin);
    } else {
      const projector = new Projector(gameId, { role: 'player', playerId: 'p1' });
      const builder = new CommandBuilder(projector.project(state));
      while (builder.stage !== 'done') builder.choose(builder.choices()[0]!);
      await b.run(host =>
        host.submit('p1', randomUUID(), projector.command(state, builder.command())),
      );
      b.release();
    }
  }
  expect(changes.length).toBeGreaterThan(0);
  expect(decisions).toBeGreaterThan(0);
  const head = (await store.readHistory(gameId)).stateHash;
  await worker.stop();
  worker = new GameWorker(store);
  const restored = await worker.acquire(gameId);
  expect(await restored.run(async host => host.state.gameId)).toBe(gameId);
  restored.release();
  expect((await store.readHistory(gameId)).stateHash).toBe(head);
  const { checksum } = (
    await sql`SELECT checksum FROM play.ai_releases WHERE id=${f.release.id}`
  )[0]!;
  await releases.activate({ id: f.release.id, checksum, versions, expectedActive: null }, p.userId);
  await finish(gameId);
}, 30000);
test('six finished AI games retain five replays, preserve history and reject old tickets and statistics', async () => {
  const first = lobbyIds[0]!;
  const ticket = await connections.issue(
    principal(p),
    first,
    'player',
    'http://localhost:5173',
    'replay',
  );
  const grant = await connections.redeem(ticket.ticket, gameIds[0]!, 'http://localhost:5173');
  const outstanding = await connections.issue(
    principal(p),
    first,
    'player',
    'http://localhost:5173',
    'replay',
  );
  const bookmark = randomUUID();
  await sql`INSERT INTO play.bookmarks(id,user_id,game_id,position,branch) VALUES(${bookmark},${p.userId},${gameIds[0]!},${'a'.repeat(32)},${'b'.repeat(32)})`;
  for (let n = 0; n < 5; n++) await finish((await create()).gameId);
  expect(await sql`SELECT id FROM play.bookmarks WHERE id=${bookmark}`).toHaveLength(0);
  const remaining =
    await sql`SELECT a.game_id,h.game_id AS payload FROM play.ai_games a LEFT JOIN play.journal_history h ON h.game_id=a.game_id WHERE a.owner_id=${p.userId}`;
  expect(remaining.filter(r => r.payload).length).toBe(5);
  await expect(connections.revalidate(grant)).rejects.toThrow('denied');
  await expect(
    connections.redeem(outstanding.ticket, gameIds[0]!, 'http://localhost:5173'),
  ).rejects.toThrow();
  const ai = await history.list(principal(p), undefined, undefined, 'ai');
  expect(ai.data).toHaveLength(6);
  expect(ai.data.find(d => d.gameId === gameIds[0])?.replayAvailable).toBe(false);
  expect((await history.list(principal(p), undefined, undefined, 'human')).data).toHaveLength(0);
  expect((await history.list(principal(stranger), undefined, undefined, 'ai')).data).toHaveLength(
    0,
  );
  expect(await sql`SELECT game_id FROM public.game_result WHERE user_id=${p.userId}`).toHaveLength(
    0,
  );
  await sql`INSERT INTO play.ai_replay_limits(user_id,replay_limit) VALUES(${p.userId},NULL)`;
  await finish((await create()).gameId);
  expect(
    (
      await sql`SELECT h.game_id FROM play.journal_history h JOIN play.ai_games a ON a.game_id=h.game_id WHERE a.owner_id=${p.userId}`
    ).length,
  ).toBe(6);
  await sql`UPDATE play.ai_replay_limits SET replay_limit=2 WHERE user_id=${p.userId}`;
  await retainAiReplays(sql, p.userId);
  expect(
    (
      await sql`SELECT h.game_id FROM play.journal_history h JOIN play.ai_games a ON a.game_id=h.game_id WHERE a.owner_id=${p.userId}`
    ).length,
  ).toBe(2);
}, 60000);
