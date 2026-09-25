import { afterAll, beforeAll, expect, spyOn, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { MemoryAiObjects, releaseFixture } from '../testing/ai/release-fixtures.ts';
import { publishRelease, AiError } from '../ai/releases/objects.ts';
import { CrossfireAiReleases } from '../../server/lib/crossfire/aiReleases.ts';
import { CrossfireAiConsent } from '../../server/lib/crossfire/aiConsent.ts';
import { CrossfireLobbies } from '../../server/lib/crossfire/lobbies.ts';
import { PostgresGameStore } from '../storage/postgres.ts';
import { DurableGame } from '../host/durable-game.ts';
import { encodeArchive } from '../history/archive.ts';
import { exportTrainingGames } from '../ai/datasets/export.ts';
import { datasetIndex, datasetKey } from '../ai/datasets/objects.ts';
import { decodeTrajectory } from '../ai/datasets/trajectory.ts';
import { versions } from '../engine/model.ts';
import { ids } from '../testing/helpers.ts';
const url = process.env.CROSSFIRE_TEST_DATABASE_URL;
if (!url || new URL(url).hostname !== '127.0.0.1' || !new URL(url).pathname.startsWith('/swubase_'))
  throw new Error('Local worktree DB required');
const sql = postgres(url, { max: 4, onnotice: () => {} });
const objects = new MemoryAiObjects();
const fixtureA = releaseFixture(),
  fixtureB = releaseFixture(),
  replacement = releaseFixture(fixtureA.release.leader.cardId);
const players = [0, 1, 2].map(() => ({
  userId: `ai-fixture-${randomUUID()}`,
  sessionId: randomUUID(),
  deckId: randomUUID(),
}));
const [a, b, c] = players as [
  (typeof players)[number],
  (typeof players)[number],
  (typeof players)[number],
];
const principal = (p: typeof a) => ({ userId: p.userId, sessionId: p.sessionId });
const gameIds: string[] = [],
  lobbyIds: string[] = [],
  exportIds: string[] = [];
let rejectLoad = false,
  needsReload = false;
const service = new CrossfireAiReleases(sql, objects, {
  async load() {
    if (rejectLoad) throw new AiError('Fixture load failure');
    needsReload = false;
    return { parameters: 123 };
  },
  async choose(release, _versions, deckKey) {
    if (needsReload) throw new AiError('Pinned model needs reloading');
    expect(deckKey).toBe('krennic');
    return { releaseId: release.id, artifact: release.artifact.sha256, action: 0, value: 0.2 };
  },
});
beforeAll(async () => {
  for (const p of players) {
    await sql`INSERT INTO "user"(id,name,email,email_verified,created_at,updated_at,display_name,currency,role) VALUES(${p.userId},'AI fixture',${p.userId + '@invalid.local'},false,now(),now(),${p.userId},'USD','crossfire')`;
    await sql`INSERT INTO session(id,token,expires_at,user_id,created_at,updated_at) VALUES(${p.sessionId},${randomUUID()},now()+interval '1 hour',${p.userId},now(),now())`;
    await sql`INSERT INTO deck(id,user_id,format,leader_card_id_1,base_card_id) VALUES(${p.deckId},${p.userId},1,${ids.leader},${ids.base})`;
    await sql`INSERT INTO deck_card(deck_id,card_id,board,quantity) VALUES(${p.deckId},${ids.marine},1,12)`;
  }
});
afterAll(async () => {
  const releaseIds = [fixtureA, fixtureB, replacement].map(f => f.release.id);
  await sql`DELETE FROM play.ai_activations WHERE release_id=ANY(${releaseIds})`;
  await sql`DELETE FROM play.ai_active WHERE release_id=ANY(${releaseIds})`;
  await sql`DELETE FROM play.ai_releases WHERE id=ANY(${releaseIds})`;
  await sql`DELETE FROM play.ai_training_exports WHERE export_id=ANY(${exportIds})`;
  await sql`DELETE FROM play.games WHERE id=ANY(${gameIds})`;
  await sql`DELETE FROM play.lobbies WHERE id=ANY(${lobbyIds})`;
  await sql`DELETE FROM deck_card WHERE deck_id=ANY(${players.map(p => p.deckId)})`;
  await sql`DELETE FROM deck WHERE id=ANY(${players.map(p => p.deckId)})`;
  await sql`DELETE FROM session WHERE user_id=ANY(${players.map(p => p.userId)})`;
  await sql`DELETE FROM "user" WHERE id=ANY(${players.map(p => p.userId)})`;
  await sql.end();
});
test('leader releases preload, activate independently, retain game pins, reload, and rollback with CAS', async () => {
  const first = await publishRelease(objects, fixtureA.release, fixtureA.weights);
  const other = await publishRelease(objects, fixtureB.release, fixtureB.weights);
  const next = await publishRelease(objects, replacement.release, replacement.weights);
  expect((await service.preview(first)).ready).toBe(true);
  await service.activate({ ...first, versions, expectedActive: null }, a.userId);
  await service.activate({ ...other, versions, expectedActive: null }, a.userId);
  const pinned = await service.pin(fixtureA.release.leader.cardId, 'krennic', versions);
  rejectLoad = true;
  await expect(
    service.activate({ ...next, versions, expectedActive: first.id }, a.userId),
  ).rejects.toThrow('load failure');
  rejectLoad = false;
  expect((await service.pin(fixtureA.release.leader.cardId, 'krennic', versions)).releaseId).toBe(
    first.id,
  );
  await service.activate({ ...next, versions, expectedActive: first.id }, a.userId);
  await expect(
    service.activate({ ...first, versions, expectedActive: first.id }, a.userId),
  ).rejects.toThrow('changed');
  needsReload = true;
  expect((await service.choose(pinned, {})).releaseId).toBe(first.id);
  expect((await service.pin(fixtureB.release.leader.cardId, 'krennic', versions)).releaseId).toBe(
    other.id,
  );
  await service.activate({ ...first, versions, expectedActive: next.id }, a.userId);
  expect((await service.pin(fixtureA.release.leader.cardId, 'krennic', versions)).releaseId).toBe(
    first.id,
  );
  await expect(service.pin(fixtureA.release.leader.cardId, 'unknown', versions)).rejects.toThrow(
    'deck',
  );
  const key = 'crossfire/ai/releases/index.json';
  const index = objects.files.get(key)!;
  const corrupt = JSON.parse(index.bytes.toString());
  corrupt.releases.find((r: { id: string }) => r.id === first.id).checksum = 'f'.repeat(64);
  objects.files.set(key, { ...index, bytes: Buffer.from(JSON.stringify(corrupt)) });
  try {
    expect((await service.status()).remoteError).toBe(
      'Release index conflicts with installed data',
    );
  } finally {
    objects.files.set(key, index);
  }
});

test('only two current opt-ins export; participants can withdraw and private data is removed', async () => {
  const identities = await Bun.file(
    new URL('../../server/db/json/card-list.json', import.meta.url),
  ).json();
  const lobbies = new CrossfireLobbies(sql, identities),
    consent = new CrossfireAiConsent(sql),
    store = new PostgresGameStore(sql);
  const policy = { allowSpectators: false, handsToPlayers: false, handsToSpectators: false };
  const lobby = await lobbies.create(principal(a), a.deckId, policy, 3);
  lobbyIds.push(lobby.id);
  const joined = await lobbies.join(principal(b), lobby.id, b.deckId, policy, 3);
  const gameId = joined.gameId!;
  gameIds.push(gameId);
  await expect(consent.get(principal(c), gameId)).rejects.toThrow('unavailable');
  expect((await consent.get(principal(a), gameId)).bothAllowed).toBe(false);
  await consent.set(principal(a), gameId, { allowed: true, policy: 1 });
  const lease = (await store.claim(gameId, 'ai-fixture', 60000))!;
  const host = await DurableGame.restore(store, lease, { checkpointEvery: 20, leaseMs: 60000 });
  await host.submit('p2', randomUUID(), {
    type: 'concede',
    gameId,
    playerId: 'p2',
    expectedRevision: host.state.revision,
  });
  await store.publishArchive(gameId, await encodeArchive(await store.readHistory(gameId)));
  await store.release(lease);
  await exportTrainingGames(sql, objects, { gameIds, exportIds });
  expect((await consent.get(principal(a), gameId)).state).toBe('waiting');
  await consent.set(principal(b), gameId, { allowed: true, policy: 1 });
  const history = spyOn(PostgresGameStore.prototype, 'historySource').mockRejectedValueOnce(
    Object.assign(new Error('Fixture transient database disconnect'), {
      code: 'CONNECTION_CLOSED',
    }),
  );
  try {
    await exportTrainingGames(sql, objects, { gameIds, exportIds });
  } finally {
    history.mockRestore();
  }
  const [retryable] = await sql`SELECT * FROM play.ai_training_exports WHERE game_id=${gameId}`;
  exportIds.push(retryable!.export_id);
  expect(retryable!.state).toBe('failed');
  expect(retryable!.attempts).toBe(1);
  expect(retryable!.error).toStartWith('Storage unavailable:');
  await sql`UPDATE play.ai_training_exports SET updated_at=now()-interval '6 minutes' WHERE export_id=${retryable!.export_id}`;
  await exportTrainingGames(sql, objects, { gameIds, exportIds });
  const [job] = await sql`SELECT * FROM play.ai_training_exports WHERE game_id=${gameId}`;
  exportIds.push(job!.export_id);
  expect(job!.state).toBe('exported');
  const key = datasetKey(job!.export_id, job!.checksum);
  const bytes = (await objects.read(key))!.bytes;
  const data = decodeTrajectory(bytes, job!.checksum);
  expect(JSON.stringify(data)).not.toContain(gameId);
  expect(JSON.stringify(data)).not.toContain(a.userId);
  expect(JSON.stringify(data)).not.toContain(a.deckId);
  expect((await consent.get(principal(b), gameId)).bothAllowed).toBe(true);
  await consent.set(principal(a), gameId, { allowed: false, policy: 1 });
  await exportTrainingGames(sql, objects, { gameIds, exportIds });
  expect(await objects.read(key)).toBeNull();
  expect((await datasetIndex(objects, job!.export_id.slice(0, 2))).entries[0]!.state).toBe(
    'revoked',
  );
  expect((await consent.get(principal(b), gameId)).state).toBe('revoked');
});

test('durable receipts revoke partial uploads and survive deletion of the source game', async () => {
  const identities = await Bun.file(
    new URL('../../server/db/json/card-list.json', import.meta.url),
  ).json();
  const lobbies = new CrossfireLobbies(sql, identities),
    consent = new CrossfireAiConsent(sql),
    store = new PostgresGameStore(sql);
  const policy = { allowSpectators: false, handsToPlayers: false, handsToSpectators: false };
  const lobby = await lobbies.create(principal(a), a.deckId, policy);
  lobbyIds.push(lobby.id);
  const gameId = (await lobbies.join(principal(b), lobby.id, b.deckId, policy)).gameId!;
  gameIds.push(gameId);
  const lease = (await store.claim(gameId, 'ai-fixture', 60000))!;
  const host = await DurableGame.restore(store, lease, { checkpointEvery: 20, leaseMs: 60000 });
  await host.submit('p2', randomUUID(), {
    type: 'concede',
    gameId,
    playerId: 'p2',
    expectedRevision: host.state.revision,
  });
  await store.publishArchive(gameId, await encodeArchive(await store.readHistory(gameId)));
  await store.release(lease);
  for (const player of [a, b])
    await consent.set(principal(player), gameId, { allowed: true, policy: 1 });
  const write = objects.write.bind(objects);
  objects.write = async (key, bytes, condition) => {
    if (key.includes('/datasets/index/')) throw new Error('Fixture index outage after data upload');
    return write(key, bytes, condition);
  };
  try {
    await exportTrainingGames(sql, objects, { gameIds, exportIds });
  } finally {
    objects.write = write;
  }
  const [job] = await sql`SELECT * FROM play.ai_training_exports WHERE game_id=${gameId}`;
  exportIds.push(job!.export_id);
  expect(job!.state).toBe('failed');
  expect(job!.checksum).not.toBeNull();
  const key = datasetKey(job!.export_id, job!.checksum);
  expect(await objects.read(key)).not.toBeNull();
  await sql`UPDATE play.ai_training_exports SET attempts=5,updated_at=now()-interval '6 minutes' WHERE export_id=${job!.export_id}`;
  await exportTrainingGames(sql, objects, { gameIds, exportIds });
  const [rotated] =
    await sql`SELECT updated_at>now()-interval '1 minute' AS rotated FROM play.ai_training_exports WHERE export_id=${job!.export_id}`;
  expect(rotated!.rotated).toBe(true);
  // Source deletion cannot erase the cleanup receipt, even for a partial upload.
  await sql`DELETE FROM play.games WHERE id=${gameId}`;
  await sql`UPDATE play.ai_training_exports SET updated_at=now()-interval '6 minutes' WHERE export_id=${job!.export_id}`;
  await exportTrainingGames(sql, objects, { gameIds, exportIds });
  const [cleaned] =
    await sql`SELECT * FROM play.ai_training_exports WHERE export_id=${job!.export_id}`;
  expect(cleaned!.game_id).toBeNull();
  expect(cleaned!.state).toBe('revoked');
  expect(cleaned!.purged_at).not.toBeNull();
  expect(await objects.read(key)).toBeNull();
});

test('withdrawal completes during a stalled upload and the finished upload is then revoked', async () => {
  const identities = await Bun.file(
    new URL('../../server/db/json/card-list.json', import.meta.url),
  ).json();
  const lobbies = new CrossfireLobbies(sql, identities),
    consent = new CrossfireAiConsent(sql),
    store = new PostgresGameStore(sql);
  const policy = { allowSpectators: false, handsToPlayers: false, handsToSpectators: false };
  const lobby = await lobbies.create(principal(a), a.deckId, policy);
  lobbyIds.push(lobby.id);
  const gameId = (await lobbies.join(principal(b), lobby.id, b.deckId, policy)).gameId!;
  gameIds.push(gameId);
  const lease = (await store.claim(gameId, 'ai-fixture', 60000))!;
  const host = await DurableGame.restore(store, lease, { checkpointEvery: 20, leaseMs: 60000 });
  await host.submit('p2', randomUUID(), {
    type: 'concede',
    gameId,
    playerId: 'p2',
    expectedRevision: host.state.revision,
  });
  await store.publishArchive(gameId, await encodeArchive(await store.readHistory(gameId)));
  await store.release(lease);
  for (const player of [a, b])
    await consent.set(principal(player), gameId, { allowed: true, policy: 1 });
  const write = objects.write.bind(objects);
  let entered!: () => void, unblock!: () => void;
  const started = new Promise<void>(resolve => {
    entered = resolve;
  });
  const gate = new Promise<void>(resolve => {
    unblock = resolve;
  });
  objects.write = async (key, bytes, condition) => {
    if (key.includes('/datasets/games/')) {
      entered();
      await gate;
    }
    return write(key, bytes, condition);
  };
  const exporting = exportTrainingGames(sql, objects, { gameIds, exportIds });
  try {
    await started;
    const withdrawn = await Promise.race([
      consent.set(principal(a), gameId, { allowed: false, policy: 1 }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Withdrawal blocked behind R2')), 1500),
      ),
    ]);
    expect(withdrawn.allowed).toBe(false);
    unblock();
    await exporting;
    const [job] = await sql`SELECT * FROM play.ai_training_exports WHERE game_id=${gameId}`;
    exportIds.push(job!.export_id);
    expect(job!.state).toBe('revoked');
    expect(job!.purged_at).not.toBeNull();
    expect(await objects.read(datasetKey(job!.export_id, job!.checksum))).toBeNull();
  } finally {
    unblock();
    await exporting;
    objects.write = write;
  }
});
