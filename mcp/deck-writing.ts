import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '../server/lib/creators/types.ts';
import { deck } from '../server/db/schema/deck.ts';
import { deckCard } from '../server/db/schema/deck_card.ts';
import { deckInformation } from '../server/db/schema/deck_information.ts';
import { user } from '../server/db/schema/auth-schema.ts';
import { deckReadAccess } from '../server/lib/decks/deckFolderAccess.ts';
import { buildDeckMetadata } from '../server/lib/decks/metadata.ts';
import { createDeckJsonExport, createDeckTextExport } from '../server/lib/decks/deckExport.ts';
import { assertDeckTextAllowed } from '../server/lib/moderation/content.ts';
import { articleCatalog } from './articles/catalog.ts';
import { mutation, readMutationReceipt, type ArticleActor } from './articles/receipts.ts';
import { createDeckRepository, deckColumns, deckRevision, type DeckRow } from './decks.ts';
import { ToolFailure } from './tools/results.ts';
import type { CardList } from '../lib/swu-resources/types.ts';

const cardId = z.string().trim().min(1).max(256);
const fields = z.strictObject({
  name: z.string().trim().min(3).max(255),
  description: z.string().max(4000),
  formatId: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(5),
    z.literal(6),
    z.literal(7),
    z.literal(8),
  ]),
  leaderCardId: cardId.nullable(),
  secondLeaderCardId: cardId.nullable(),
  baseCardId: cardId.nullable(),
  visibility: z.enum(['private', 'public', 'unlisted']),
});
const quantityInput = z.strictObject({
  cardId,
  board: z.enum(['main', 'sideboard', 'maybeboard']),
  quantity: z.number().int().min(0).max(1000),
});
const uniqueCards = (cards: { cardId: string; board: string }[]) =>
  new Set(cards.map(card => `${card.board}:${card.cardId}`)).size === cards.length;
const expected = {
  deckId: z.uuid(),
  expectedRevision: z.string().regex(/^[a-f0-9]{64}$/),
  requestId: z.uuid(),
};
export const deckCreateInput = fields.extend({
  requestId: z.uuid(),
  description: fields.shape.description.default(''),
  leaderCardId: cardId.nullable().default(null),
  secondLeaderCardId: cardId.nullable().default(null),
  baseCardId: cardId.nullable().default(null),
  visibility: fields.shape.visibility.default('private'),
  cards: z
    .array(quantityInput)
    .max(500)
    .refine(uniqueCards, 'Each card/board pair must be unique.')
    .default([]),
});
export const deckDuplicateInput = z.object({
  sourceDeckId: z.uuid(),
  expectedRevision: expected.expectedRevision,
  requestId: z.uuid(),
  name: fields.shape.name,
  visibility: fields.shape.visibility.default('private'),
});
export const deckUpdateInput = z.object({
  ...expected,
  fields: fields
    .partial()
    .refine(input => Object.keys(input).length > 0, 'Supply at least one field.'),
});
export const deckCardsUpdateInput = z.object({
  ...expected,
  cards: z
    .array(quantityInput)
    .min(1)
    .max(100)
    .refine(uniqueCards, 'Each card/board pair must be unique.'),
});
export const deckExportInput = z.object({
  deckId: z.uuid(),
  format: z.enum(['native', 'json', 'text']).default('native'),
});
const boards = { main: 1, sideboard: 2, maybeboard: 3 } as const;
const visibility = { private: 0, public: 1, unlisted: 2 } as const;
type Card = { cardId: string; board: number; quantity: number };
type Saved = {
  deckId: string;
  revision: string;
  changedCards?: { cardId: string; board: number; before: number; after: number }[];
  changedFields?: string[];
};
const metadata = (input: Partial<z.infer<typeof fields>>) => ({
  ...(input.name === undefined ? {} : { name: input.name }),
  ...(input.description === undefined ? {} : { description: input.description }),
  ...(input.formatId === undefined ? {} : { format: input.formatId }),
  ...(input.visibility === undefined ? {} : { public: visibility[input.visibility] }),
  ...(input.leaderCardId === undefined ? {} : { leaderCardId1: input.leaderCardId }),
  ...(input.secondLeaderCardId === undefined ? {} : { leaderCardId2: input.secondLeaderCardId }),
  ...(input.baseCardId === undefined ? {} : { baseCardId: input.baseCardId }),
});

function validateMetadata(
  data: Pick<
    DeckRow,
    'name' | 'description' | 'format' | 'leaderCardId1' | 'leaderCardId2' | 'baseCardId'
  >,
  catalog: CardList,
) {
  assertDeckTextAllowed(data);
  for (const [id, type] of [
    [data.leaderCardId1, 'Leader'],
    [data.leaderCardId2, 'Leader'],
    [data.baseCardId, 'Base'],
  ] as const) {
    if (id && !catalog[id]?.type.includes(type))
      throw new ToolFailure(`Choose an available ${type.toLowerCase()} card.`, 400);
  }
  if (data.leaderCardId2 && data.format !== 2)
    throw new ToolFailure('A second leader is only supported for Twin Suns.', 400);
  if (data.leaderCardId1 && data.leaderCardId1 === data.leaderCardId2)
    throw new ToolFailure('Choose different leaders.', 400);
}
function validateCards(cards: Card[], catalog: CardList) {
  for (const card of cards)
    if (card.quantity > 0) {
      const known = catalog[card.cardId];
      if (!known || ['Leader', 'Base', 'Token'].some(type => known.type.includes(type)))
        throw new ToolFailure(
          `Card ${card.cardId} is unavailable or cannot be placed on a deck board.`,
          400,
        );
    }
}
async function snapshot(db: Database, userId: string, id: string) {
  const result = await createDeckRepository(db).getDeck(userId, id);
  if (!result) throw new ToolFailure('Deck not found or unavailable to your account.', 404);
  if ('tooLarge' in result)
    throw new ToolFailure('This deck exceeds the supported content limit.', 413);
  if (result.deck.cardPoolId)
    throw new ToolFailure(
      'This operation supports normal decks only. Edit limited decks through their card pool.',
      400,
    );
  return result;
}
async function owned(db: Database, actor: ArticleActor, id: string, lock = false) {
  const query = db
    .select({ id: deck.id })
    .from(deck)
    .where(and(eq(deck.id, id), eq(deck.userId, actor.userId)));
  const rows = lock ? await query.for('update') : await query;
  if (!rows.length) throw new ToolFailure('Deck not found or unavailable to your account.', 404);
}

export function createDeckWritingRepository(
  database: Database,
  catalogReader = articleCatalog(database),
) {
  const replay = async (db: Database, actor: ArticleActor, result: Record<string, unknown>) => {
    await owned(db, actor, z.uuid().parse(result.deckId));
  };
  async function write(
    actor: ArticleActor,
    tool: string,
    input: { requestId: string },
    work: (tx: Database, catalog: CardList) => Promise<Saved>,
  ) {
    const saved = await readMutationReceipt<Saved>(
      database,
      actor,
      tool,
      input.requestId,
      input,
      (db, result) => replay(db, actor, result),
    );
    if (saved) return saved;
    // Load once before opening a transaction; the MCP pool has only four slots.
    const catalog = await catalogReader();
    return mutation(
      database,
      actor,
      tool,
      input.requestId,
      input,
      tx => work(tx, catalog),
      (db, result) => replay(db, actor, result),
    );
  }
  async function insert(
    tx: Database,
    actor: ArticleActor,
    data: typeof deck.$inferInsert,
    cards: Card[],
    catalog: CardList,
  ): Promise<Saved> {
    const [row] = await tx
      .insert(deck)
      .values({ ...data, userId: actor.userId, cardPoolId: null })
      .returning(deckColumns);
    if (!row) throw new ToolFailure('The deck could not be created.', 503);
    const contents = cards.filter(card => card.quantity > 0);
    if (contents.length)
      await tx
        .insert(deckCard)
        .values(contents.map(card => ({ ...card, deckId: row.id, note: '' })));
    // A new deck has no interactions. Existing counters are never reconstructed
    // by this restricted client; the main app coordinates discussion repairs.
    await tx.insert(deckInformation).values({ deckId: row.id, ...buildDeckMetadata(row, catalog) });
    return { deckId: row.id, revision: deckRevision({ deck: row, contents }) };
  }
  async function edit(
    actor: ArticleActor,
    tool: 'update_deck' | 'update_deck_cards',
    input: z.infer<typeof deckUpdateInput> | z.infer<typeof deckCardsUpdateInput>,
  ) {
    return write(actor, tool, input, async (tx, catalog) => {
      await owned(tx, actor, input.deckId, true);
      const before = await snapshot(tx, actor.userId, input.deckId);
      if (deckRevision(before) !== input.expectedRevision)
        throw new ToolFailure(
          'Deck changed. Read it again, reconcile your edits, and use a new requestId.',
          409,
        );
      const changedCards: NonNullable<Saved['changedCards']> = [];
      const changedFields: string[] = [];
      let row = before.deck;
      let contents = before.contents;
      if ('cards' in input) {
        const changes = input.cards.map(card => ({ ...card, board: boards[card.board] }));
        validateCards(changes, catalog);
        const merged = new Map(contents.map(card => [`${card.board}:${card.cardId}`, card]));
        for (const change of changes) {
          const key = `${change.board}:${change.cardId}`;
          const previous = merged.get(key)?.quantity ?? 0;
          if (previous === change.quantity && change.quantity !== 0) continue;
          // Also remove legacy zero rows, which normal reads intentionally omit.
          if (change.quantity === 0) {
            await tx
              .delete(deckCard)
              .where(
                and(
                  eq(deckCard.deckId, row.id),
                  eq(deckCard.cardId, change.cardId),
                  eq(deckCard.board, change.board),
                ),
              );
            if (previous === 0) continue;
          }
          changedCards.push({
            cardId: change.cardId,
            board: change.board,
            before: previous,
            after: change.quantity,
          });
          if (change.quantity === 0) {
            merged.delete(key);
          } else {
            merged.set(key, change);
            await tx
              .insert(deckCard)
              .values({ ...change, deckId: row.id, note: '' })
              .onConflictDoUpdate({
                target: [deckCard.deckId, deckCard.cardId, deckCard.board],
                set: { quantity: change.quantity },
              });
          }
        }
        contents = [...merged.values()];
        if (contents.length > 500)
          throw new ToolFailure(
            'This deck exceeds 500 card rows. Remove cards before adding more.',
            413,
          );
      } else {
        const changes = metadata(input.fields);
        const next = { ...row, ...changes };
        validateMetadata(next, catalog);
        for (const key of Object.keys(changes) as (keyof typeof changes)[])
          if (row[key] !== changes[key]) changedFields.push(key);
        if (changedFields.length) {
          const [updated] = await tx
            .update(deck)
            .set(changes)
            .where(and(eq(deck.id, row.id), eq(deck.userId, actor.userId)))
            .returning(deckColumns);
          row = updated!;
          const information = await tx
            .update(deckInformation)
            .set(buildDeckMetadata(row, catalog))
            .where(eq(deckInformation.deckId, row.id))
            .returning({ deckId: deckInformation.deckId });
          if (!information.length)
            throw new ToolFailure(
              'Deck metadata is missing. Open and save the deck in SWUBASE before retrying.',
              409,
            );
        }
      }
      if (changedCards.length || changedFields.length) {
        const [updated] = await tx
          .update(deck)
          .set({
            updatedAt: sql`greatest(clock_timestamp(), ${deck.updatedAt} + interval '1 millisecond')`,
          })
          .where(and(eq(deck.id, row.id), eq(deck.userId, actor.userId)))
          .returning(deckColumns);
        row = updated!;
      }
      return {
        deckId: row.id,
        revision: deckRevision({ deck: row, contents }),
        changedCards,
        changedFields,
      };
    });
  }
  return {
    create(actor: ArticleActor, input: z.infer<typeof deckCreateInput>) {
      return write(actor, 'create_deck', input, async (tx, catalog) => {
        const data = {
          ...metadata(input),
          userId: actor.userId,
          name: input.name,
          description: input.description,
          format: input.formatId,
          leaderCardId1: input.leaderCardId,
          leaderCardId2: input.secondLeaderCardId,
          baseCardId: input.baseCardId,
        };
        const cards = input.cards.map(card => ({ ...card, board: boards[card.board] }));
        validateMetadata(data, catalog);
        validateCards(cards, catalog);
        return insert(tx, actor, data, cards, catalog);
      });
    },
    duplicate(actor: ArticleActor, input: z.infer<typeof deckDuplicateInput>) {
      return write(actor, 'duplicate_deck', input, async (tx, catalog) => {
        await tx
          .select({ id: deck.id })
          .from(deck)
          .where(and(eq(deck.id, input.sourceDeckId), deckReadAccess(actor.userId)))
          .for('share');
        const source = await snapshot(tx, actor.userId, input.sourceDeckId);
        if (deckRevision(source) !== input.expectedRevision)
          throw new ToolFailure('Source deck changed. Read it again and use a new requestId.', 409);
        assertDeckTextAllowed({ name: input.name, description: source.deck.description });
        return insert(
          tx,
          actor,
          {
            userId: actor.userId,
            name: input.name,
            description: source.deck.description,
            format: source.deck.format,
            public: visibility[input.visibility],
            leaderCardId1: source.deck.leaderCardId1,
            leaderCardId2: source.deck.leaderCardId2,
            baseCardId: source.deck.baseCardId,
          },
          source.contents,
          catalog,
        );
      });
    },
    update: (actor: ArticleActor, input: z.infer<typeof deckUpdateInput>) =>
      edit(actor, 'update_deck', input),
    updateCards: (actor: ArticleActor, input: z.infer<typeof deckCardsUpdateInput>) =>
      edit(actor, 'update_deck_cards', input),
    async export(userId: string, input: z.infer<typeof deckExportInput>) {
      const result = await snapshot(database, userId, input.deckId);
      const catalog = await catalogReader();
      const missingCardIds = [
        ...new Set(
          [
            ...result.contents.map(card => card.cardId),
            result.deck.leaderCardId1,
            result.deck.leaderCardId2,
            result.deck.baseCardId,
          ].filter((id): id is string => Boolean(id) && !catalog[id!]),
        ),
      ];
      const previewCardIds = [
        ...new Set(
          [
            ...result.contents.map(card => card.cardId),
            result.deck.leaderCardId1,
            result.deck.leaderCardId2,
            result.deck.baseCardId,
          ].filter((id): id is string => Boolean(id) && Boolean(catalog[id!]?.preview)),
        ),
      ];
      const cards = result.contents.map(card => ({ ...card, deckId: result.deck.id }));
      const [author] = await database
        .select({ displayName: user.displayName })
        .from(user)
        .where(eq(user.id, result.deck.userId));
      const data =
        input.format === 'text'
          ? createDeckTextExport(result.deck, cards, catalog)
          : input.format === 'json'
            ? createDeckJsonExport(
                result.deck,
                cards,
                { displayName: author?.displayName ?? '' },
                catalog,
              )
            : {
                version: 1,
                name: result.deck.name,
                description: result.deck.description,
                formatId: result.deck.format,
                leaderCardId: result.deck.leaderCardId1,
                secondLeaderCardId: result.deck.leaderCardId2,
                baseCardId: result.deck.baseCardId,
                cards: result.contents.map(card => ({
                  ...card,
                  board: card.board === 1 ? 'main' : card.board === 2 ? 'sideboard' : 'maybeboard',
                })),
              };
      return {
        deckId: input.deckId,
        revision: deckRevision(result),
        format: input.format,
        data,
        missingCardIds,
        previewCardIds,
        maybeboardIncluded: input.format === 'native',
        warning:
          input.format === 'native'
            ? 'Native cards use logical SWUBASE IDs and preserve all boards. Pass fields/cards to create_deck with a new requestId; unknown archived cards must be resolved first.'
            : 'Text/JSON exports omit maybeboard. Preview export IDs may not be supported by the destination; missing cards use logical IDs.',
      };
    },
  };
}
export type DeckWritingRepository = ReturnType<typeof createDeckWritingRepository>;
