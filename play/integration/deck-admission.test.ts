import { afterAll, beforeAll, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { readDeckInput } from '../../server/lib/crossfire/readDeckInput.ts';
import { prepareDeckSnapshot } from '../admission/decks.ts';
import type { CardIdentityCatalog } from '../admission/decks.ts';
import { ids } from '../testing/helpers.ts';

const url = process.env.CROSSFIRE_TEST_DATABASE_URL;
if (!url) throw new Error('Set CROSSFIRE_TEST_DATABASE_URL to an isolated local worktree database');
const parsed = new URL(url);
if (
  !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) ||
  !parsed.pathname.startsWith('/swubase_')
)
  throw new Error('Refusing non-worktree database');
const sql = postgres(url, { max: 3, onnotice: () => {} });
const db = drizzle(sql);
const prefix = `admission-${randomUUID()}`;
const owner = `${prefix}-owner`,
  visitor = `${prefix}-visitor`;
const decks: string[] = [],
  pools: string[] = [];
const catalog: CardIdentityCatalog = await Bun.file(
  new URL('../../server/db/json/card-list.json', import.meta.url),
).json();
const prepare = (input: unknown, format = 'core-practice') =>
  prepareDeckSnapshot(input, catalog, format);
const read = (deckId: string, userId: string | null = owner) => readDeckInput(db, userId, deckId, catalog);
beforeAll(async () => {
  for (const id of [owner, visitor])
    await sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at, display_name, currency, role)
      VALUES (${id}, 'Synthetic Crossfire fixture', ${id + '@invalid.local'}, false, now(), now(), ${id}, 'USD', 'crossfire')`;
});
afterAll(async () => {
  await sql`DELETE FROM card_pool_deck_cards WHERE deck_id = ANY(${decks})`;
  await sql`DELETE FROM card_pool_decks WHERE deck_id = ANY(${decks})`;
  await sql`DELETE FROM deck_card WHERE deck_id = ANY(${decks})`;
  await sql`DELETE FROM deck WHERE id = ANY(${decks})`;
  await sql`DELETE FROM card_pool_cards WHERE card_pool_id = ANY(${pools})`;
  await sql`DELETE FROM card_pools WHERE id = ANY(${pools})`;
  await sql`DELETE FROM "user" WHERE id = ANY(${[owner, visitor]})`;
  await sql.end();
});
async function normal(visibility = 0) {
  const id = randomUUID();
  decks.push(id);
  await sql`INSERT INTO deck (id, user_id, format, leader_card_id_1, base_card_id, public)
    VALUES (${id}, ${owner}, 1, ${ids.leader}, ${ids.base}, ${visibility})`;
  await sql`INSERT INTO deck_card (deck_id, card_id, board, quantity)
    VALUES (${id}, ${ids.marine}, 1, 12), (${id}, ${ids.fighter}, 1, 0),
      (${id}, 'open-fire', 2, 2), (${id}, 'unimplemented-maybeboard-fixture', 3, 3)`;
  return id;
}
async function limited() {
  const id = await normal(1),
    pool = randomUUID();
  pools.push(pool);
  await sql`INSERT INTO card_pools (id, user_id, type) VALUES (${pool}, ${owner}, 'draft')`;
  await sql`UPDATE deck SET card_pool_id = ${pool}, format = 4 WHERE id = ${id}`;
  await sql`INSERT INTO card_pool_decks (deck_id, card_pool_id, user_id, visibility)
    VALUES (${id}, ${pool}, ${owner}, 'public')`;
  for (let n = 0; n < 12; n++) {
    const card =
      n < 6
        ? ids.marine
        : n === 6
          ? ids.leader
          : n === 7
            ? ids.base
            : n < 10
              ? ids.fighter
              : 'unimplemented-pool-fixture';
    await sql`INSERT INTO card_pool_cards (card_pool_id, card_pool_number, card_id) VALUES (${pool}, ${n}, ${card})`;
    await sql`INSERT INTO card_pool_deck_cards (deck_id, card_pool_number, location)
      VALUES (${id}, ${n}, ${n < 8 ? 'deck' : n < 11 ? 'pool' : 'trash'})`;
  }
  return { id, pool };
}

test('owner/private and direct public/unlisted access are enforced before reading cards', async () => {
  const privateId = await normal(0),
    publicId = await normal(1),
    unlistedId = await normal(2);
  expect(await read(privateId, visitor)).toBeNull();
  expect(await read(randomUUID(), visitor)).toBeNull();
  expect(await read(privateId)).not.toBeNull();
  expect(await read(publicId, visitor)).not.toBeNull();
  expect(await read(unlistedId, visitor)).not.toBeNull();
  expect(await read(privateId, null)).toBeNull();
  expect(await read(publicId, null)).not.toBeNull();
  expect(await read(unlistedId, null)).not.toBeNull();
});

test('normal snapshots omit zero/maybeboard rows and stay fixed through later edits without timestamp changes', async () => {
  const id = await normal();
  const input = (await read(id))!;
  const result = prepare(input);
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  const snapshot = result.snapshot;
  expect(snapshot.mainboard).toEqual([{ cardId: ids.marine, quantity: 12 }]);
  expect(snapshot.sideboard).toEqual([{ cardId: 'open-fire', quantity: 2 }]);
  expect(snapshot.reserve).toEqual([]);
  expect(JSON.stringify(snapshot)).not.toContain('maybeboard');
  expect(() => {
    snapshot.mainboard[0]!.quantity = 999;
  }).toThrow();
  input.mainboard[0]!.quantity = 2;
  expect(snapshot.mainboard[0]!.quantity).toBe(12);
  await sql`UPDATE deck_card SET quantity = 11 WHERE deck_id = ${id} AND board = 1 AND card_id = ${ids.marine}`;
  const changed = prepare(await read(id));
  if (!changed.ok) throw new Error('Changed deck rejected');
  expect(changed.snapshot.contentHash).not.toBe(snapshot.contentHash);
  expect(snapshot.mainboard[0]!.quantity).toBe(12);
});

test('limited physical copies become main/reserve, excluding slot cards and trash', async () => {
  const { id } = await limited();
  const result = prepare(await read(id, visitor));
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  expect(result.snapshot.mainboard).toEqual([{ cardId: ids.marine, quantity: 6 }]);
  expect(result.snapshot.sideboard).toEqual([]);
  expect(result.snapshot.reserve).toEqual([
    { cardId: ids.fighter, quantity: 2 },
    { cardId: 'unimplemented-pool-fixture', quantity: 1 },
  ]);
  expect(result.snapshot.inactiveUnsupported).toEqual(['unimplemented-pool-fixture']);
  expect(result.snapshot.sourceKind).toBe('limited');
});

test('inconsistent limited visibility/ownership and missing physical references fail closed', async () => {
  const { id } = await limited();
  expect(await read(id, null)).not.toBeNull();
  await sql`UPDATE card_pool_decks SET visibility = 'private' WHERE deck_id = ${id}`;
  expect(await read(id, visitor)).toBeNull();
  expect(await read(id, null)).toBeNull();
  expect(await read(id)).not.toBeNull();
  await sql`UPDATE card_pool_decks SET user_id = ${visitor} WHERE deck_id = ${id}`;
  expect(await read(id)).toBeNull();
  await sql`UPDATE card_pool_decks SET user_id = ${owner} WHERE deck_id = ${id}`;
  await sql`INSERT INTO card_pool_deck_cards (deck_id, card_pool_number, location) VALUES (${id}, 999, 'deck')`;
  await expect(read(id)).rejects.toThrow('unresolved physical card');
});

test('unknown and unimplemented cards, tokens, two leaders and other formats cannot enter core practice', async () => {
  const id = await normal();
  const input = (await read(id))!;
  for (const [card, code] of [
    ['unknown-card-fixture', 'unknown-card'],
    ['shield', 'wrong-role'],
    ['overwhelming-barrage', 'unsupported-card'],
  ] as const) {
    const result = prepare({ ...input, mainboard: [{ cardId: card!, quantity: 12 }] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues).toContainEqual({ code, cardId: card, zone: 'mainboard' });
  }
  const leaders = prepare({ ...input, leader2: ids.leader });
  expect(leaders.ok).toBe(false);
  if (!leaders.ok) expect(leaders.issues).toContainEqual({ code: 'leader-count' });
  const format = prepare(input, 'premier');
  expect(format.ok).toBe(false);
  if (!format.ok) expect(format.issues).toContainEqual({ code: 'unsupported-format' });
  const negative = prepare({ ...input, mainboard: [{ cardId: ids.marine, quantity: -1 }] });
  expect(negative.ok).toBe(false);
});

test('content hashes normalize row order and duplicates while preserving inactive-deck changes', async () => {
  const input = (await read(await normal()))!;
  const a = prepare(input);
  const b = prepare({
    ...input,
    source: { ...input.source, deckId: randomUUID() },
    mainboard: [
      { cardId: ids.marine, quantity: 5 },
      { cardId: ids.marine, quantity: 7 },
    ],
  });
  const c = prepare({ ...input, sideboard: [{ cardId: 'open-fire', quantity: 1 }] });
  if (!a.ok || !b.ok || !c.ok) throw new Error('Expected valid practice decks');
  expect(a.snapshot.contentHash).toBe(b.snapshot.contentHash);
  expect(a.snapshot.contentHash).not.toBe(c.snapshot.contentHash);
});
