import { expect, test } from 'bun:test';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, inArray } from 'drizzle-orm';
import { readFile } from 'node:fs/promises';
import { user } from '../server/db/schema/auth-schema.ts';
import { deck } from '../server/db/schema/deck.ts';
import { deckCard } from '../server/db/schema/deck_card.ts';
import { deckInformation } from '../server/db/schema/deck_information.ts';
import { cardPools } from '../server/db/schema/card_pool.ts';
import { mcpMutation } from '../server/db/schema/mcp-mutation.ts';
import { cardList } from '../server/db/lists.ts';
import {
  createDeckWritingRepository,
  deckCreateInput,
  deckDuplicateInput,
  deckUpdateInput,
  deckCardsUpdateInput,
  deckExportInput,
} from './deck-writing.ts';
import { createDeckRepository, deckDetails } from './decks.ts';
import { MCP_RESOURCE_SCOPES } from '../shared/mcp/config.ts';
import { createDeckWritingTools } from './tools/deck-writing.ts';
import { toolSuccess } from './tools/results.ts';

const enabled = process.env.SWUBASE_MCP_DB_TEST === '1';
test.skipIf(!enabled)(
  'deck writes enforce owner access, atomic revision checks, retries, metadata, all boards and export privacy with restricted grants',
  async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_'))
      throw new Error('Use an isolated worktree database.');
    const admin = postgres(target.href, { max: 3 }),
      runtime = postgres(target.href, { max: 1 }),
      runtimePeer = postgres(target.href, { max: 1 });
    const db = drizzle(admin),
      limited = drizzle(runtime);
    const ids = [crypto.randomUUID(), crypto.randomUUID()];
    const role = 'mcp_deck_write_' + crypto.randomUUID().replaceAll('-', '');
    const actor = {
      userId: ids[0]!,
      clientId: crypto.randomUUID(),
      scopes: [...MCP_RESOURCE_SCOPES],
    };
    const foreign = { ...actor, userId: ids[1]! };
    const poolId = crypto.randomUUID();
    try {
      await admin`create role ${admin(role)} nologin`;
      await admin
        .unsafe(
          (await readFile(new URL('./deploy/grants.sql', import.meta.url), 'utf8'))
            .replaceAll('swubase_mcp', role)
            .replace(':"DBNAME"', `"${target.pathname.slice(1)}"`),
        )
        .simple();
      await runtime`set role ${runtime(role)}`;
      await runtimePeer`set role ${runtimePeer(role)}`;
      await db.insert(user).values(
        ids.map(id => ({
          id,
          name: 'PRIVATE LEGAL NAME',
          displayName: id,
          email: id + '@invalid.local',
          emailVerified: false,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      const repository = createDeckWritingRepository(limited);
      const peer = createDeckWritingRepository(drizzle(runtimePeer));
      const reader = createDeckRepository(limited);
      const read = async (id: string) => {
        const result = await reader.getDeck(actor.userId, id);
        if (!result || 'tooLarge' in result) throw new Error('Missing fixture deck');
        return deckDetails(result, 'https://example.invalid');
      };
      const input = deckCreateInput.parse({
        requestId: crypto.randomUUID(),
        name: 'My private deck',
        description: 'PRIVATE DECK PROSE',
        formatId: 1,
        leaderCardId: 'qui-gon-jinn--student-of-the-living-force',
        baseCardId: 'echo-base',
        cards: [
          { cardId: 'coruscant-guard', board: 'main', quantity: 3 },
          { cardId: 'rebel-assault', board: 'sideboard', quantity: 2 },
          { cardId: 'rebel-assault', board: 'maybeboard', quantity: 1 },
        ],
      });
      const [created, simultaneousRetry] = await Promise.all([
        repository.create(actor, input),
        peer.create(actor, input),
      ]);
      expect(simultaneousRetry).toEqual(created);
      expect(await repository.create(actor, input)).toEqual(created);
      expect(await read(created.deckId)).toMatchObject({
        revision: created.revision,
        visibility: 'private',
        boards: { main: [expect.objectContaining({ cardId: 'coruscant-guard', quantity: 3 })] },
      });
      expect(
        (
          await db.select().from(deckInformation).where(eq(deckInformation.deckId, created.deckId))
        )[0],
      ).toMatchObject({ aspectCommand: 1, aspectHeroism: 1 });
      await expect(
        repository.create(actor, { ...input, name: 'Different input' }),
      ).rejects.toMatchObject({ status: 409 });
      const independent = await repository.create(
        { ...actor, clientId: 'different-client' },
        input,
      );
      expect(independent.deckId).not.toBe(created.deckId);
      const offline = createDeckWritingRepository(limited, async () => {
        throw new Error('catalog unavailable');
      });
      expect(await offline.create(actor, input)).toEqual(created);
      await expect(
        repository.updateCards(
          foreign,
          deckCardsUpdateInput.parse({
            deckId: created.deckId,
            expectedRevision: created.revision,
            requestId: crypto.randomUUID(),
            cards: [{ cardId: 'coruscant-guard', board: 'main', quantity: 1 }],
          }),
        ),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        repository.duplicate(
          foreign,
          deckDuplicateInput.parse({
            sourceDeckId: created.deckId,
            expectedRevision: created.revision,
            requestId: crypto.randomUUID(),
            name: 'Forbidden duplicate',
          }),
        ),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        repository.export(foreign.userId, deckExportInput.parse({ deckId: created.deckId })),
      ).rejects.toMatchObject({ status: 404 });
      await db
        .update(deckCard)
        .set({ note: 'PRIVATE CARD NOTE' })
        .where(eq(deckCard.deckId, created.deckId));
      const patch = deckCardsUpdateInput.parse({
        deckId: created.deckId,
        expectedRevision: created.revision,
        requestId: crypto.randomUUID(),
        cards: [
          { cardId: 'coruscant-guard', board: 'main', quantity: 2 },
          { cardId: 'coruscant-guard', board: 'sideboard', quantity: 1 },
          { cardId: 'rebel-assault', board: 'sideboard', quantity: 0 },
        ],
      });
      const changed = await repository.updateCards(actor, patch);
      expect(changed.changedCards).toEqual([
        { cardId: 'coruscant-guard', board: 1, before: 3, after: 2 },
        { cardId: 'coruscant-guard', board: 2, before: 0, after: 1 },
        { cardId: 'rebel-assault', board: 2, before: 2, after: 0 },
      ]);
      expect(changed.revision).not.toBe(created.revision);
      expect((await read(created.deckId)).revision).toBe(changed.revision);
      expect(await offline.updateCards(actor, patch)).toEqual(changed);
      const stored = await db.select().from(deckCard).where(eq(deckCard.deckId, created.deckId));
      expect(stored.find(card => card.cardId === 'coruscant-guard' && card.board === 1)?.note).toBe(
        'PRIVATE CARD NOTE',
      );
      expect(stored.some(card => card.quantity === 0)).toBe(false);
      await expect(
        repository.updateCards(actor, { ...patch, requestId: crypto.randomUUID() }),
      ).rejects.toMatchObject({ status: 409 });
      const noOp = await repository.updateCards(actor, {
        ...patch,
        expectedRevision: changed.revision,
        requestId: crypto.randomUUID(),
      });
      expect(noOp.revision).toBe(changed.revision);
      expect(noOp.changedCards).toEqual([]);
      await db.insert(deckCard).values({
        deckId: created.deckId,
        cardId: 'legacy-zero-row',
        board: 3,
        quantity: 0,
      });
      await repository.updateCards(actor, {
        ...patch,
        expectedRevision: changed.revision,
        requestId: crypto.randomUUID(),
        cards: [{ cardId: 'legacy-zero-row', board: 'maybeboard', quantity: 0 }],
      });
      expect(
        (await db.select().from(deckCard).where(eq(deckCard.deckId, created.deckId))).some(
          card => card.cardId === 'legacy-zero-row',
        ),
      ).toBe(false);
      await expect(
        repository.updateCards(actor, {
          ...patch,
          expectedRevision: changed.revision,
          requestId: crypto.randomUUID(),
          cards: [
            { cardId: 'coruscant-guard', board: 'main', quantity: 1 },
            { cardId: 'unknown-card', board: 'main', quantity: 2 },
          ],
        }),
      ).rejects.toMatchObject({ status: 400 });
      expect((await read(created.deckId)).revision).toBe(changed.revision);
      // Distinct concurrent operations compete on one revision; exactly one wins.
      const competing = await Promise.allSettled(
        [1, 4].map((quantity, i) =>
          (i ? peer : repository).updateCards(actor, {
            ...patch,
            expectedRevision: changed.revision,
            requestId: crypto.randomUUID(),
            cards: [{ cardId: 'coruscant-guard', board: 'main', quantity }],
          }),
        ),
      );
      expect(competing.filter(result => result.status === 'fulfilled')).toHaveLength(1);
      expect(competing.find(result => result.status === 'rejected')).toMatchObject({
        reason: { status: 409 },
      });
      const latest = await read(created.deckId);
      await db
        .update(deckInformation)
        .set({ favoritesCount: 7, commentsCount: 9, score: 12 })
        .where(eq(deckInformation.deckId, created.deckId));
      const metadata = await repository.update(
        actor,
        deckUpdateInput.parse({
          deckId: created.deckId,
          expectedRevision: latest.revision,
          requestId: crypto.randomUUID(),
          fields: {
            name: 'Renamed deck',
            visibility: 'public',
            baseCardId: 'administrator-s-tower',
          },
        }),
      );
      expect(await read(created.deckId)).toMatchObject({
        name: 'Renamed deck',
        visibility: 'public',
        revision: metadata.revision,
      });
      expect(
        (
          await db.select().from(deckInformation).where(eq(deckInformation.deckId, created.deckId))
        )[0],
      ).toMatchObject({ favoritesCount: 7, commentsCount: 9, score: 12 });
      const copied = await repository.duplicate(
        foreign,
        deckDuplicateInput.parse({
          sourceDeckId: created.deckId,
          expectedRevision: metadata.revision,
          requestId: crypto.randomUUID(),
          name: 'My testing copy',
        }),
      );
      expect((await db.select().from(deck).where(eq(deck.id, copied.deckId)))[0]).toMatchObject({
        userId: foreign.userId,
        public: 0,
      });
      expect(
        (await db.select().from(deckCard).where(eq(deckCard.deckId, copied.deckId))).every(
          card => card.note === '',
        ),
      ).toBe(true);
      await expect(
        repository.updateCards(foreign, {
          ...patch,
          expectedRevision: metadata.revision,
          requestId: crypto.randomUUID(),
        }),
      ).rejects.toMatchObject({ status: 404 });
      const native = await repository.export(
        actor.userId,
        deckExportInput.parse({ deckId: created.deckId }),
      );
      expect(native).toMatchObject({
        maybeboardIncluded: true,
        data: {
          cards: expect.arrayContaining([
            expect.objectContaining({ board: 'maybeboard', quantity: 1 }),
          ]),
        },
      });
      expect(JSON.stringify(native)).not.toContain('PRIVATE CARD NOTE');
      expect(JSON.stringify(native)).not.toContain('PRIVATE LEGAL NAME');
      const exported = await repository.export(
        actor.userId,
        deckExportInput.parse({ deckId: created.deckId, format: 'json' }),
      );
      expect(exported).toMatchObject({
        maybeboardIncluded: false,
        data: { metadata: { name: 'Renamed deck', author: ids[0] } },
      });
      expect(exported.data).not.toHaveProperty('maybeboard');
      const text = await repository.export(
        actor.userId,
        deckExportInput.parse({ deckId: created.deckId, format: 'text' }),
      );
      expect(typeof text.data).toBe('string');
      expect(text.data).toContain('Coruscant Guard');
      // The receipt retains IDs/revisions/quantity changes, never deck prose or notes.
      const receipts = await db
        .select()
        .from(mcpMutation)
        .where(eq(mcpMutation.userId, actor.userId));
      expect(JSON.stringify(receipts)).not.toContain('PRIVATE');
      expect(JSON.stringify(receipts)).not.toContain('My private deck');
      // Existing unavailable references can be duplicated/exported and removed.
      await db
        .insert(deckCard)
        .values({ deckId: created.deckId, cardId: 'archived-card', board: 3, quantity: 1 });
      const archived = await read(created.deckId);
      await expect(
        repository.updateCards(actor, {
          ...patch,
          expectedRevision: metadata.revision,
          requestId: crypto.randomUUID(),
        }),
      ).rejects.toMatchObject({ status: 409 });
      expect(
        (await repository.export(actor.userId, deckExportInput.parse({ deckId: created.deckId })))
          .missingCardIds,
      ).toContain('archived-card');
      const archivedCopy = await repository.duplicate(
        actor,
        deckDuplicateInput.parse({
          sourceDeckId: created.deckId,
          expectedRevision: archived.revision,
          requestId: crypto.randomUUID(),
          name: 'Archived copy',
        }),
      );
      expect((await read(archivedCopy.deckId)).missingCardIds).toContain('archived-card');
      await repository.updateCards(
        actor,
        deckCardsUpdateInput.parse({
          deckId: created.deckId,
          expectedRevision: archived.revision,
          requestId: crypto.randomUUID(),
          cards: [{ cardId: 'archived-card', board: 'maybeboard', quantity: 0 }],
        }),
      );
      // Active previews are accepted without changing the official-only card tools.
      const previewId = 'mcp-preview-fixture';
      const previews = createDeckWritingRepository(limited, async () => ({
        ...cardList,
        [previewId]: {
          ...cardList['coruscant-guard']!,
          cardId: previewId,
          preview: true,
          karabast_id: 'CUSTOM_PREVIEW',
        },
      }));
      const preview = await previews.create(
        actor,
        deckCreateInput.parse({
          requestId: crypto.randomUUID(),
          name: 'Preview fixture',
          formatId: 7,
          cards: [{ cardId: previewId, board: 'main', quantity: 1 }],
        }),
      );
      expect(
        await previews.export(
          actor.userId,
          deckExportInput.parse({ deckId: preview.deckId, format: 'json' }),
        ),
      ).toMatchObject({
        previewCardIds: [previewId],
        data: { deck: [{ id: 'CUSTOM_PREVIEW', count: 1 }] },
      });
      // Leave legacy counter repair to the main app; reject the whole patch.
      await db.delete(deckInformation).where(eq(deckInformation.deckId, preview.deckId));
      await expect(
        previews.update(actor, {
          deckId: preview.deckId,
          expectedRevision: preview.revision,
          requestId: crypto.randomUUID(),
          fields: { name: 'Must roll back' },
        }),
      ).rejects.toMatchObject({ status: 409 });
      expect((await read(preview.deckId)).name).toBe('Preview fixture');
      await db.insert(cardPools).values({
        id: poolId,
        userId: actor.userId,
        name: 'Pool fixture',
        type: 'sealed',
        custom: true,
        visibility: 'private',
      });
      const [poolDeck] = await db
        .insert(deck)
        .values({ userId: actor.userId, format: 3, name: 'Pool deck', cardPoolId: poolId })
        .returning();
      await expect(
        repository.export(actor.userId, deckExportInput.parse({ deckId: poolDeck!.id })),
      ).rejects.toMatchObject({ status: 400 });
      await expect(
        repository.update(
          actor,
          deckUpdateInput.parse({
            deckId: poolDeck!.id,
            expectedRevision: 'a'.repeat(64),
            requestId: crypto.randomUUID(),
            fields: { name: 'No conversion' },
          }),
        ),
      ).rejects.toMatchObject({ status: 400 });
      const tools = createDeckWritingTools(repository);
      for (const tool of tools.filter(tool => tool.name !== 'export_deck')) {
        let admitted = false;
        expect(
          await tool.invoke(
            {},
            {
              actor: { ...actor, scopes: ['cards:read', 'decks:read'] },
              websiteOrigin: 'https://example.invalid',
            },
            async (_name, work) => {
              admitted = true;
              return toolSuccess((await work()).data);
            },
          ),
        ).toMatchObject({ isError: true, structuredContent: { code: 'forbidden' } });
        expect(admitted).toBe(false);
      }
      // Replays recheck ownership even after the initial write succeeded.
      await db.update(deck).set({ userId: foreign.userId }).where(eq(deck.id, independent.deckId));
      await expect(
        repository.create({ ...actor, clientId: 'different-client' }, input),
      ).rejects.toMatchObject({ status: 404 });
      for (const query of [
        'select note from deck_card',
        'update deck set user_id = user_id where false',
        'delete from deck where false',
        'update deck_information set favorites_count = 1 where false',
        'select content from discussion_comment',
      ])
        await expect(runtime.unsafe(query).execute()).rejects.toMatchObject({ code: '42501' });
    } finally {
      await runtime`reset role`;
      await runtimePeer`reset role`;
      await runtimePeer.end();
      await runtime.end();
      const rows = await db.select({ id: deck.id }).from(deck).where(inArray(deck.userId, ids));
      if (rows.length) {
        const deckIds = rows.map(row => row.id);
        await db.delete(deckInformation).where(inArray(deckInformation.deckId, deckIds));
        await db.delete(deckCard).where(inArray(deckCard.deckId, deckIds));
        await db.delete(deck).where(inArray(deck.id, deckIds));
      }
      await db.delete(cardPools).where(eq(cardPools.id, poolId));
      await db.delete(user).where(inArray(user.id, ids));
      await admin`drop owned by ${admin(role)}`;
      await admin`drop role ${admin(role)}`;
      await admin.end();
    }
  },
  60000,
);
