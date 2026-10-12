import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { deck } from '../../db/schema/deck.ts';
import { deckCard } from '../../db/schema/deck_card.ts';
import { deckVersion, deckVersionCard } from '../../db/schema/deck_version.ts';
import { userDeckFavorite } from '../../db/schema/user_deck_favorite.ts';
import type { AuthExtension } from '../../auth/auth.ts';
import { deckRoute } from '../../routes/deck.ts';
import { getBulkDecks } from './getBulkDecks.ts';
import { getDeckVersionHistory } from './getDeckVersionHistory.ts';
import { getDeckVersionDiff } from './getDeckVersionDiff.ts';
import { createDeckVersionDelta, type VersionedDeckCard } from './versionedDeckState.ts';

const enabled = process.env.SWUBASE_DECK_VERSION_DB_TEST === '1';
if (enabled) {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
    throw new Error('Use an isolated worktree database.');
}

async function countQueries<T>(operation: () => Promise<T>) {
  const previous = db.$client.options.debug;
  let queries = 0;
  db.$client.options.debug = (_connection, text) => {
    if (/^select\b/i.test(text)) queries++;
  };
  try {
    return { data: await operation(), queries };
  } finally {
    db.$client.options.debug = previous;
  }
}

const createUser = (id: string) =>
  db.insert(user).values({
    id,
    name: id,
    displayName: id,
    email: `${id}@invalid.local`,
    emailVerified: false,
    currency: 'USD',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

test.skipIf(!enabled)('stale and concurrent saves preserve exactly one open head', async () => {
  const ownerId = crypto.randomUUID(),
    deckId = crypto.randomUUID();
  await createUser(ownerId);
  const app = new Hono<AuthExtension>()
    .use('*', async (c, next) => {
      c.set('user', { id: ownerId } as NonNullable<AuthExtension['Variables']['user']>);
      await next();
    })
    .route('/deck', deckRoute);
  const post = (expectedUpdatedAt: string) =>
    app.request(`/deck/${deckId}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changeNote: 'Kept note', expectedUpdatedAt }),
    });
  try {
    const initialDate = new Date('2000-01-01T00:00:00Z');
    await db.insert(deck).values({
      id: deckId,
      userId: ownerId,
      name: 'Save concurrency',
      format: 1,
      updatedAt: initialDate,
    });
    const first = await post(initialDate.toISOString());
    expect(first.status).toBe(201);
    const firstBody = await first.json();
    const sealedId = firstBody.data.sealedVersion.id;
    const edit = await app.request(`/deck/${deckId}/card`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: { deckId, cardId: 'test-card', board: 1 },
        data: { quantity: 3 },
      }),
    });
    expect(edit.status).toBe(201);
    const edited = await edit.json();
    expect((await post(initialDate.toISOString())).status).toBe(409);
    expect(await db.select().from(deckVersion).where(eq(deckVersion.deckId, deckId))).toHaveLength(
      2,
    );
    const concurrent = await Promise.all([post(edited.deckUpdatedAt), post(edited.deckUpdatedAt)]);
    expect(concurrent.map(response => response.status).sort()).toEqual([201, 400]);
    const versions = await db.select().from(deckVersion).where(eq(deckVersion.deckId, deckId));
    expect(versions).toHaveLength(3);
    expect(versions.filter(version => !version.sealedAt)).toHaveLength(1);
    expect(
      await db.select().from(deckVersionCard).where(eq(deckVersionCard.deckVersionId, sealedId)),
    ).toHaveLength(0);
    const index = await db.execute(
      sql`SELECT indexdef FROM pg_indexes WHERE tablename = 'game_result' AND indexname = 'gr_dv_idx'`,
    );
    expect(index).toHaveLength(1);
  } finally {
    await db.delete(deckCard).where(eq(deckCard.deckId, deckId));
    await db.delete(deck).where(eq(deck.id, deckId));
    await db.delete(user).where(eq(user.id, ownerId));
  }
});

test.skipIf(!enabled)(
  'history and bulk query counts stay bounded while preserving snapshots and access',
  async () => {
    const ownerId = crypto.randomUUID(),
      viewerId = crypto.randomUUID();
    const deckIds = Array.from({ length: 12 }, () => crypto.randomUUID());
    const versionIds: string[] = [];
    const expected = new Map<string, VersionedDeckCard[]>();
    const now = new Date();
    await createUser(ownerId);
    await createUser(viewerId);
    try {
      await db.insert(deck).values(
        deckIds.map((id, index) => ({
          id,
          userId: ownerId,
          name: `Current ${index}`,
          format: 1,
          public: index === 11 ? 0 : 1,
          versionCount: index === 0 ? 31 : 3,
        })),
      );
      for (const [index, deckId] of deckIds.entries()) {
        let before: VersionedDeckCard[] = [];
        const count = index === 0 ? 30 : 2;
        for (let number = 1; number <= count; number++) {
          const id = crypto.randomUUID();
          versionIds.push(id);
          const cards: VersionedDeckCard[] = [
            {
              cardId: 'card-a',
              board: number % 2 ? 1 : 2,
              quantity: (number % 3) + 1,
              note: `Note ${number}`,
            },
          ];
          if (number % 4 === 0) cards.push({ cardId: 'card-b', board: 1, quantity: 2, note: '' });
          expected.set(id, cards);
          await db.insert(deckVersion).values({
            id,
            deckId,
            versionNumber: number,
            name: `Saved ${index}/${number}`,
            description: '',
            format: 1,
            sealedAt: now,
            sealedByUserId: ownerId,
          });
          const delta = createDeckVersionDelta(before, cards);
          await db
            .insert(deckVersionCard)
            .values(delta.map(card => ({ ...card, deckVersionId: id })));
          before = cards;
        }
        const openId = crypto.randomUUID();
        versionIds.push(openId);
        await db.insert(deckVersion).values({ id: openId, deckId, versionNumber: count + 1 });
        expected.set(openId, before);
        await db
          .insert(deckCard)
          .values([
            ...before.map(card => ({ ...card, deckId })),
            { deckId, cardId: 'maybeboard', board: 3, quantity: 1 },
          ]);
      }
      await db.insert(userDeckFavorite).values({ deckId: deckIds[0], userId: viewerId });
      const small = await countQueries(() => getDeckVersionHistory(deckIds[1]));
      const large = await countQueries(() => getDeckVersionHistory(deckIds[0]));
      expect(small.queries).toBeGreaterThan(0);
      expect(large.queries).toBe(small.queries);
      expect(large.queries).toBe(5);
      expect(large.data).toHaveLength(31);
      expect(large.data[0].hasChanges).toBe(true); // live name differs from the last saved name
      expect(large.data[0].hasPlayableChanges).toBe(false);
      for (const history of large.data.slice(0, 5)) {
        const diff = await getDeckVersionDiff(deckIds[0], history.id);
        expect(diff.summary).toEqual({
          addedCards: history.addedCards,
          removedCards: history.removedCards,
          changedCards: history.changedCards,
        });
      }
      const one = await countQueries(() => getBulkDecks([deckIds[0], versionIds[0]], viewerId));
      const many = await countQueries(() => getBulkDecks([...deckIds, ...versionIds], viewerId));
      expect(many.queries).toBeLessThanOrEqual(one.queries + 1); // one batched folder-access check for the private deck
      expect(many.queries).toBeLessThanOrEqual(9);
      for (const id of [...deckIds, ...versionIds]) {
        const row = many.data.decks[id];
        if (!row) continue;
        expect(row.deck.public).toBe(1);
        expect(row.user).not.toHaveProperty('email');
        if (expected.has(id)) {
          expect(
            many.data.cards[id]
              .map(({ deckId: _deckId, ...card }) => card)
              .sort((a, b) => a.cardId.localeCompare(b.cardId)),
          ).toEqual([...expected.get(id)!].sort((a, b) => a.cardId.localeCompare(b.cardId)));
          expect(row.permissions?.canSaveVersion).toBe(false);
        } else expect(many.data.cards[id].some(card => card.board === 3)).toBe(true);
      }
      expect(many.data.decks[deckIds[0]]?.isFavorite).not.toBeNull();
      expect(many.data.decks[deckIds[11]]).toBeUndefined();
      expect(many.data.decks[versionIds.at(-1)!]).toBeUndefined();
      expect(many.data.decks[versionIds[0]]?.deck.name).toBe('Saved 0/1');
      expect(Object.keys(many.data.decks)).toHaveLength(deckIds.length + versionIds.length - 4);
    } finally {
      await db.delete(userDeckFavorite).where(eq(userDeckFavorite.userId, viewerId));
      await db.delete(deckCard).where(inArray(deckCard.deckId, deckIds));
      await db.delete(deck).where(inArray(deck.id, deckIds));
      await db.delete(user).where(inArray(user.id, [ownerId, viewerId]));
    }
  },
  30_000,
);
