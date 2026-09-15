import { publishCardRelease, type ReleaseObjects } from '../releases/storage.ts';
import { CrossfireConnections } from '../../server/lib/crossfire/connections.ts';
import { versionsFor } from '../cards/catalog.ts';
import { afterAll, beforeAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { CrossfireLobbies } from '../../server/lib/crossfire/lobbies.ts';
import { CrossfireMatches } from '../../server/lib/crossfire/matches.ts';
import { CrossfireCardReleases } from '../../server/lib/crossfire/cardReleases.ts';
import { PostgresGameStore } from '../storage/postgres.ts';
import { DurableGame } from '../host/durable-game.ts';
import { encodeArchive } from '../history/archive.ts';
import { CardCatalog, catalogFor } from '../cards/catalog.ts';
import {
  ACTIVE_CARD_BUNDLE,
  CARD_BUNDLE_CHANNEL,
  activeCardVersions,
  initializeCardBundles,
  activateCardBundle,
} from '../storage/card-bundles.ts';
import { ids } from '../testing/helpers.ts';
const url = process.env.CROSSFIRE_TEST_DATABASE_URL;
if (!url || new URL(url).hostname !== '127.0.0.1' || !new URL(url).pathname.startsWith('/swubase_'))
  throw new Error('Local worktree DB required');
const sql = postgres(url, { max: 6, onnotice: () => {} });
const identities = await Bun.file(
  new URL('../../server/db/json/card-list.json', import.meta.url),
).json();
const lobbies = new CrossfireLobbies(sql, identities),
  matches = new CrossfireMatches(sql, identities),
  store = new PostgresGameStore(sql);
const players = [0, 1].map(() => ({
  userId: `bundle-test-${randomUUID()}`,
  sessionId: randomUUID(),
  deckId: randomUUID(),
}));
const [a, b] = players as [(typeof players)[number], (typeof players)[number]];
const principal = (p: typeof a) => ({ userId: p.userId, sessionId: p.sessionId });
const policy = { allowSpectators: true, handsToPlayers: false, handsToSpectators: false };
let original: CardCatalog, updated: CardCatalog;
beforeAll(async () => {
  await initializeCardBundles(sql);
  original = catalogFor({ versions: await activeCardVersions(sql) });
  const data = structuredClone(original.data);
  data.version = `1.0.${Date.now()}`;
  const marine = data.cards.find(c => c.cardId === ids.marine)!;
  if (marine.kind === 'unit') marine.power = 9;
  updated = new CardCatalog(data);
  for (const p of players) {
    await sql`INSERT INTO "user"(id,name,email,email_verified,created_at,updated_at,display_name,currency, role) VALUES(${p.userId},'Bundle fixture',${p.userId + '@invalid.local'},false,now(),now(),${p.userId},'USD', 'crossfire')`;
    await sql`INSERT INTO session(id,token,expires_at,user_id,created_at,updated_at) VALUES(${p.sessionId},${randomUUID()},now()+interval '1 hour',${p.userId},now(),now())`;
    await sql`INSERT INTO deck(id,user_id,format,leader_card_id_1,base_card_id) VALUES(${p.deckId},${p.userId},1,${ids.leader},${ids.base})`;
    await sql`INSERT INTO deck_card(deck_id,card_id,board,quantity) VALUES(${p.deckId},${ids.marine},1,12)`;
  }
});
afterAll(async () => {
  if (original && updated)
    await sql`UPDATE public.application_configuration SET value=${original.data.version} WHERE key=${ACTIVE_CARD_BUNDLE} AND value=${updated.data.version}`;
  const rows =
    await sql`SELECT game_id FROM play.lobbies WHERE creator_user_id=ANY(${players.map(p => p.userId)}) AND game_id IS NOT NULL`;
  await sql`DELETE FROM play.games WHERE id=ANY(${rows.map(r => r.game_id)})`;
  await sql`DELETE FROM play.lobbies WHERE creator_user_id=ANY(${players.map(p => p.userId)})`;
  await sql`DELETE FROM deck_card WHERE deck_id=ANY(${players.map(p => p.deckId)})`;
  await sql`DELETE FROM deck WHERE id=ANY(${players.map(p => p.deckId)})`;
  await sql`DELETE FROM session WHERE user_id=ANY(${players.map(p => p.userId)})`;
  await sql`DELETE FROM "user" WHERE id=ANY(${players.map(p => p.userId)})`;
  if (updated)
    await sql`DELETE FROM play.card_bundles WHERE version=${updated.data.version} AND NOT EXISTS(SELECT 1 FROM play.lobbies WHERE versions->>'cards'=${updated.pin}) AND NOT EXISTS(SELECT 1 FROM play.games WHERE versions->>'cards'=${updated.pin})`;
  await sql.end();
});
async function finish(lobbyId: string) {
  const lobby = (await lobbies.get(principal(a), lobbyId))!;
  const lease = (await store.claim(lobby.gameId!, 'bundle-tests', 60000))!;
  const host = await DurableGame.restore(store, lease, { checkpointEvery: 20, leaseMs: 60000 });
  await host.submit('p2', randomUUID(), {
    type: 'concede',
    gameId: lobby.gameId!,
    playerId: 'p2',
    expectedRevision: host.state.revision,
  });
  await store.publishArchive(
    lobby.gameId!,
    await encodeArchive(await store.readHistory(lobby.gameId!)),
  );
  await store.release(lease);
}
async function coldReplay(gameId: string) {
  const child = Bun.spawn(
    [
      process.execPath,
      new URL('../testing/fixtures/recover-card-bundle.ts', import.meta.url).pathname,
      gameId,
    ],
    { env: { ...process.env, CROSSFIRE_TEST_DATABASE_URL: url! }, stdout: 'pipe', stderr: 'pipe' },
  );
  const [out, error, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code) throw new Error(error);
  return JSON.parse(out);
}
test('activation pins waiting invitations and BO3; new matches and rematches use the new release; cold replays load historical data', async () => {
  const root = await lobbies.create(principal(a), a.deckId, policy, 3);
  let delivered!: (pin: string) => void;
  const notification = new Promise<string>(resolve => {
    delivered = resolve;
  });
  const listener = await sql.listen(CARD_BUNDLE_CHANNEL, pin => delivered(pin));
  const files = new Map<string, { bytes: Uint8Array; etag: string }>();
  let objectRevision = 0;
  const objects: ReleaseObjects = {
    async read(key) {
      return files.get(key) ?? null;
    },
    async write(key, bytes, condition) {
      const old = files.get(key);
      if (condition.create ? !!old : old?.etag !== condition.etag)
        throw new Error('Precondition failed');
      files.set(key, { bytes, etag: String(++objectRevision) });
    },
  };
  await publishCardRelease(objects, updated, {
    version: updated.data.version,
    checksum: updated.hash,
    requiredEngine: updated.data.requiredEngine,
    runtimeVersion: '1.0.0',
    runtimeFingerprint: 'a'.repeat(64),
    sourceCommit: 'b'.repeat(40),
    publishedAt: new Date().toISOString(),
    cards: updated.data.cards.length,
  });
  const remoteAdmin = new CrossfireCardReleases(sql, objects);
  const selection = {
    version: updated.data.version,
    checksum: updated.hash,
    source: 'remote' as const,
  };
  expect((await remoteAdmin.preview(selection)).changed.map(c => c.cardId)).toEqual([ids.marine]);
  await remoteAdmin.activate({ ...selection, expectedActive: original.data.version });
  expect(
    await Promise.race([
      notification,
      new Promise(resolve => setTimeout(() => resolve('timeout'), 3000)),
    ]),
  ).toBe(updated.pin);
  await listener.unlisten();
  await lobbies.join(principal(b), root.id, b.deckId, policy, 3);
  const old = (await lobbies.get(principal(a), root.id))!;
  expect((await store.readHistory(old.gameId!)).versions.cards).toBe(original.pin);
  const fresh = await lobbies.create(principal(a), a.deckId, policy, 1);
  await lobbies.join(principal(b), fresh.id, b.deckId, policy, 1);
  const freshGame = (await lobbies.get(principal(a), fresh.id))!;
  expect((await store.readHistory(freshGame.gameId!)).versions.cards).toBe(updated.pin);
  // Individually compatible bundles still must agree within a game and match.
  await sql`UPDATE play.lobbies SET versions=${sql.json(versionsFor(original))} WHERE id=${fresh.id}`;
  try {
    expect((await lobbies.get(principal(a), fresh.id))!.compatible).toBe(false);
    await expect(
      new CrossfireConnections(sql, 'http://localhost').issue(
        principal(a),
        fresh.id,
        'player',
        'http://localhost',
      ),
    ).rejects.toThrow('incompatible');
    await expect(matches.get(principal(a), fresh.id)).rejects.toThrow('incompatible');
  } finally {
    await sql`UPDATE play.lobbies SET versions=${sql.json(versionsFor(updated))} WHERE id=${fresh.id}`;
  }
  await finish(root.id);
  const ready = {
    kind: 'next' as const,
    ready: true,
    mainboard: [{ cardId: ids.marine, quantity: 12 }],
  };
  await matches.ready(principal(a), root.id, ready);
  await matches.ready(principal(b), root.id, ready);
  const next = (await matches.get(principal(a), root.id))!.games.at(-1)!;
  const second = (await lobbies.get(principal(a), next.lobbyId))!;
  expect((await store.readHistory(second.gameId!)).versions.cards).toBe(original.pin);
  await finish(second.id);
  await matches.ready(principal(a), second.id, { kind: 'rematch', ready: true });
  await matches.ready(principal(b), second.id, { kind: 'rematch', ready: true });
  const rematch = (await matches.get(principal(a), second.id))!.rematchLobbyId!;
  const restarted = (await lobbies.get(principal(a), rematch))!;
  expect((await store.readHistory(restarted.gameId!)).versions.cards).toBe(updated.pin);
  expect((await coldReplay(old.gameId!)).cards).toBe(original.pin);
  const freshHistory = await store.readHistory(freshGame.gameId!);
  expect(await coldReplay(freshGame.gameId!)).toEqual({
    cards: updated.pin,
    hash: freshHistory.stateHash,
  });
  const admin = new CrossfireCardReleases(sql, null);
  const preview = await admin.preview({
    version: original.data.version,
    checksum: original.hash,
    source: 'installed',
  });
  expect(preview.changed.map(c => c.cardId)).toEqual([ids.marine]);
  await expect(
    activateCardBundle(sql, original, 'a'.repeat(40), null, original.data.version),
  ).rejects.toThrow('active release changed');
  expect((await activeCardVersions(sql)).cards).toBe(updated.pin);
}, 30000);
