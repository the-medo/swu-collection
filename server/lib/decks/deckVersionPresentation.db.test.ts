import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { deck } from '../../db/schema/deck.ts';
import { deckCard } from '../../db/schema/deck_card.ts';
import { deckVersion } from '../../db/schema/deck_version.ts';
import type { IntegrationGameData } from '../../db/schema/integration.ts';
import type { AuthExtension } from '../../auth/auth.ts';
import { deckRoute } from '../../routes/deck.ts';
import { saveDeckVersion } from './saveDeckVersion.ts';
import { getEffectiveDeck } from './getEffectiveDeck.ts';
import { getDeckVersionDiff } from './getDeckVersionDiff.ts';
import { getDeckMetaTags } from '../utils/metaTagsFetchers.ts';
import { resolveKarabastDeckReferences } from '../game-results/resolveKarabastDeckReferences.ts';

const enabled = process.env.SWUBASE_DECK_VERSION_DB_TEST === '1';
if (enabled) {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
    throw new Error('Use an isolated worktree database.');
}

test.skipIf(!enabled)(
  'saved metadata agrees across detail, bulk, export, previews and Karabast; diffs include notes',
  async () => {
    const ownerId = crypto.randomUUID(),
      deckId = crypto.randomUUID();
    const sourceDate = new Date('2020-01-01T00:00:00Z');
    await db.insert(user).values({
      id: ownerId,
      name: 'Fixture',
      displayName: 'Fixture',
      email: `${ownerId}@invalid.local`,
      emailVerified: false,
      currency: 'USD',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        c.set('user', { id: ownerId } as NonNullable<AuthExtension['Variables']['user']>);
        await next();
      })
      .route('/deck', deckRoute);
    try {
      await db.insert(deck).values({
        id: deckId,
        userId: ownerId,
        name: 'Saved name',
        description: 'Saved description',
        format: 1,
        public: 1,
        leaderCardId1: 'sabine-wren--galvanized-revolutionary',
        baseCardId: 'command-center',
        updatedAt: sourceDate,
      });
      await db.insert(deckCard).values([
        { deckId, cardId: 'battlefield-marine', board: 1, quantity: 2, note: 'Keep one' },
        { deckId, cardId: 'fleet-lieutenant', board: 2, quantity: 1, note: 'Sideboard note' },
      ]);
      const first = await saveDeckVersion({ deckId, actorId: ownerId });
      await db
        .update(deck)
        .set({
          name: 'Current name',
          description: '',
          format: 2,
          leaderCardId1: null,
          leaderCardId2: 'another-leader',
          baseCardId: null,
          updatedAt: new Date(),
        })
        .where(eq(deck.id, deckId));
      await db
        .update(deckCard)
        .set({ note: 'New note' })
        .where(and(eq(deckCard.deckId, deckId), eq(deckCard.board, 1)));
      await db.delete(deckCard).where(and(eq(deckCard.deckId, deckId), eq(deckCard.board, 2)));
      const sealedId = first.sealedVersion.id,
        openId = first.openVersion.id;
      const detail = await (await app.request(`/deck/${sealedId}`)).json();
      const bulk = await (
        await app.request(`/deck/bulk/data?ids=${sealedId},${openId},${deckId}`)
      ).json();
      expect(bulk.decks[sealedId].deck).toEqual(detail.deck);
      expect(detail.deck).toMatchObject({
        name: 'Saved name',
        description: 'Saved description',
        format: 1,
        leaderCardId1: 'sabine-wren--galvanized-revolutionary',
        leaderCardId2: null,
        baseCardId: 'command-center',
        updatedAt: sourceDate.toISOString(),
      });
      expect(bulk.decks[openId].deck.name).toBe('Current name');
      expect(bulk.decks[deckId].deck.name).toBe('Current name');
      const exported = await (await app.request(`/deck/${sealedId}/json`)).json();
      expect(exported.metadata.name).toBe('Saved name');
      expect(exported.leader).toBeDefined();
      expect(exported.leader2).toBeUndefined();
      expect(exported.base).toBeDefined();
      const preview = await getDeckMetaTags(sealedId);
      expect(preview?.['og:title']).toBe('Saved name | SWUBase');
      expect(preview?.['og:description']).toContain('Saved description');
      const resolve = (id: string) =>
        resolveKarabastDeckReferences({
          data: { players: [{ data: { deck: { id } } }] },
        } as IntegrationGameData);
      const sealed = await resolve(sealedId);
      expect(sealed[0]?.deckInfo).toEqual({ name: 'Saved name', formatId: 1, cardPoolId: null });
      expect(sealed[0]?.deckVersionId).toBe(sealedId);
      expect(sealed[0]?.decklist).toHaveLength(2);
      for (const id of [openId, deckId]) {
        const current = await resolve(id);
        expect(current[0]?.deckInfo).toEqual({
          name: 'Current name',
          formatId: 2,
          cardPoolId: null,
        });
        expect(current[0]?.deckVersionId).toBe(openId);
      }
      const diff = await getDeckVersionDiff(deckId, openId);
      expect(diff.changes).toEqual([{ cardId: 'fleet-lieutenant', board: 2, quantityChange: -1 }]);
      expect(diff.noteChanges).toEqual([
        { cardId: 'battlefield-marine', board: 1, before: 'Keep one', after: 'New note' },
        { cardId: 'fleet-lieutenant', board: 2, before: 'Sideboard note', after: '' },
      ]);
      expect(diff.metadata.before).toMatchObject({
        name: 'Saved name',
        description: 'Saved description',
        format: 1,
        leaderCardId2: null,
      });
      expect(diff.metadata.after).toMatchObject({
        name: 'Current name',
        description: '',
        format: 2,
        leaderCardId1: null,
        baseCardId: null,
      });
      const second = await saveDeckVersion({ deckId, actorId: ownerId });
      const savedDiff = await getDeckVersionDiff(deckId, openId);
      expect(savedDiff.noteChanges).toEqual(diff.noteChanges);
      expect(savedDiff.metadata).toEqual(diff.metadata);
      const empty = await getDeckVersionDiff(deckId, second.openVersion.id);
      expect(empty.changes).toEqual([]);
      expect(empty.noteChanges).toEqual([]);
      expect(empty.metadata.before).toEqual(empty.metadata.after);
      await db.update(deckCard).set({ note: '' }).where(eq(deckCard.deckId, deckId));
      const notesOnly = await getDeckVersionDiff(deckId, second.openVersion.id);
      expect(notesOnly.changes).toEqual([]);
      expect(notesOnly.noteChanges).toEqual([
        { cardId: 'battlefield-marine', board: 1, before: 'New note', after: '' },
      ]);
      expect(notesOnly.metadata.before).toEqual(notesOnly.metadata.after);
      const parent = (await db.select().from(deck).where(eq(deck.id, deckId)))[0];
      const savedRow = (await db.select().from(deckVersion).where(eq(deckVersion.id, sealedId)))[0];
      const legacy = getEffectiveDeck(parent, {
        ...savedRow,
        name: null,
        format: null,
        description: null,
        leaderCardId1: null,
        baseCardId: null,
        sourceDeckUpdatedAt: null,
      });
      expect(legacy).toMatchObject({
        name: 'Current name',
        format: 2,
        description: '',
        leaderCardId1: null,
        leaderCardId2: null,
        baseCardId: null,
        updatedAt: savedRow.sealedAt,
      });
      expect(getEffectiveDeck(parent, { ...savedRow, sealedAt: null })).toBe(parent);
    } finally {
      await db.delete(deckCard).where(eq(deckCard.deckId, deckId));
      await db.delete(deck).where(eq(deck.id, deckId));
      await db.delete(user).where(eq(user.id, ownerId));
    }
  },
  30_000,
);
