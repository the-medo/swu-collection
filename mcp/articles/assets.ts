import { z } from 'zod';
import type { Database } from '../../server/lib/creators/types.ts';
import { mcpPrepareImageQuota } from './userLock.ts';
import { and, asc, desc, eq, ilike, inArray, isNull, or } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { user } from '../../server/db/schema/auth-schema.ts';
import { deck } from '../../server/db/schema/deck.ts';
import { cardPools } from '../../server/db/schema/card_pool.ts';
import { userAlbum } from '../../server/db/schema/user_album.ts';
import { userFile } from '../../server/db/schema/user_file.ts';
import { tournament } from '../../server/db/schema/tournament.ts';
import { tournamentGroup } from '../../server/db/schema/tournament_group.ts';
import { articleCatalog } from './catalog.ts';
import { createUserFileService } from '../../server/lib/user-files/serviceCore.ts';
import {
  createUserFileStorage,
  userFileObjectKeys,
  type UserFileObjectStorage,
} from '../../server/lib/user-files/storage.ts';
import { withUserFileMutation } from '../../server/lib/user-files/admission.ts';
import { CreatorError } from '../../server/lib/creators/errors.ts';
import { createDeckRepository } from '../decks.ts';
import { setInfo } from '../../lib/swu-resources/set-info.ts';
import type { TemplateCard, TemplateDeck } from '../../shared/types/ArticleTemplates.ts';
import { MCP_DECK_SCOPE } from '../../shared/mcp/config.ts';
import { optimizeUserImage } from '../../server/lib/user-files/optimize.ts';
import { recommendedHeaderImageWidth } from '../../types/ImageGallery.ts';
import { maxUserFileBytes } from '../../types/UserFile.ts';
import { mutation, readMutationReceipt, type ArticleActor } from './receipts.ts';

export type AssetSearch = {
  kind: 'card' | 'deck' | 'pool' | 'album' | 'user' | 'set' | 'tournament' | 'group';
  query: string;
  id?: string;
  limit: number;
  offset: number;
  includeMine: boolean;
};
export function createArticleAssets(
  database: PostgresJsDatabase,
  storage: UserFileObjectStorage = createUserFileStorage(),
) {
  const images = createUserFileService(database, storage, mcpPrepareImageQuota);
  const filterText = (query: string) => `%${query.replace(/[\\%_]/g, '\\$&')}%`;
  async function cards(): Promise<TemplateCard[]> {
    return Object.values(await articleCatalog(database)()).flatMap(card => {
      if (!card) return [];
      const variants = Object.values(card.variants).filter(v => !!v);
      const variant = variants.find(v => v.variantName === 'Standard') ?? variants[0];
      return [
        {
          cardId: card.cardId,
          variantId: variant?.variantId ?? '',
          name: [card.name, card.subtitle].filter(Boolean).join(' — '),
          type: card.type,
          cost: card.cost,
          rarity: card.rarity,
        },
      ];
    });
  }
  return {
    cards,
    async search(actor: ArticleActor, input: AssetSearch) {
      if (
        input.id &&
        !['card', 'set', 'user'].includes(input.kind) &&
        !z.uuid().safeParse(input.id).success
      )
        throw new CreatorError('This asset requires a UUID.');
      const q = filterText(input.query);
      let rows: Record<string, unknown>[];
      if (input.kind === 'card') {
        rows = Object.values(await articleCatalog(database)())
          .flatMap(card => (card ? [card] : []))
          .filter(card =>
            input.id
              ? card.cardId === input.id
              : `${card.cardId} ${card.name} ${card.subtitle ?? ''}`
                  .toLowerCase()
                  .includes(input.query.toLowerCase()),
          )
          .sort((a, b) => a.cardId.localeCompare(b.cardId))
          .slice(input.offset, input.offset + input.limit + 1)
          .map(card => ({
            cardId: card.cardId,
            name: [card.name, card.subtitle].filter(Boolean).join(' — '),
            type: card.type,
            set: card.set,
            variants: Object.values(card.variants)
              .filter(v => !!v)
              .map(v => ({ variantId: v.variantId, variantName: v.variantName })),
            preview: card.preview ?? false,
          }));
      } else if (input.kind === 'set') {
        rows = Object.values(setInfo)
          .filter(set =>
            input.id
              ? set.code === input.id
              : `${set.code} ${set.name}`.toLowerCase().includes(input.query.toLowerCase()),
          )
          .slice(input.offset, input.offset + input.limit + 1)
          .map(set => ({ id: set.code, name: set.name }));
      } else if (input.kind === 'deck') {
        if (input.includeMine && !actor.scopes.includes(MCP_DECK_SCOPE))
          throw new CreatorError('Approve decks:read to search your private decks.', 403);
        rows = await database
          .select({ id: deck.id, name: deck.name, visibility: deck.public })
          .from(deck)
          .where(
            and(
              or(
                eq(deck.public, 1),
                input.includeMine ? eq(deck.userId, actor.userId) : undefined,
                input.id ? eq(deck.public, 2) : undefined,
              ),
              input.id ? eq(deck.id, input.id) : ilike(deck.name, q),
            ),
          )
          .orderBy(desc(deck.updatedAt), deck.id)
          .limit(input.limit + 1)
          .offset(input.offset);
      } else if (input.kind === 'pool') {
        rows = await database
          .select({
            id: cardPools.id,
            name: cardPools.name,
            visibility: cardPools.visibility,
            type: cardPools.type,
            status: cardPools.status,
          })
          .from(cardPools)
          .where(
            and(
              isNull(cardPools.archivedAt),
              or(
                eq(cardPools.visibility, 'public'),
                input.includeMine ? eq(cardPools.userId, actor.userId) : undefined,
                input.id ? eq(cardPools.visibility, 'unlisted') : undefined,
              ),
              input.id ? eq(cardPools.id, input.id) : ilike(cardPools.name, q),
            ),
          )
          .orderBy(desc(cardPools.updatedAt), cardPools.id)
          .limit(input.limit + 1)
          .offset(input.offset);
      } else if (input.kind === 'album') {
        rows = await database
          .select({ id: userAlbum.id, name: userAlbum.title, visibility: userAlbum.visibility })
          .from(userAlbum)
          .where(
            and(
              or(
                eq(userAlbum.visibility, 'public'),
                input.includeMine ? eq(userAlbum.userId, actor.userId) : undefined,
                input.id ? eq(userAlbum.visibility, 'unlisted') : undefined,
              ),
              input.id ? eq(userAlbum.id, input.id) : ilike(userAlbum.title, q),
            ),
          )
          .orderBy(desc(userAlbum.createdAt), userAlbum.id)
          .limit(input.limit + 1)
          .offset(input.offset);
      } else if (input.kind === 'user') {
        if (!input.id && input.query.length < 2)
          throw new CreatorError('Use at least two characters to find a user.');
        rows = await database
          .select({ id: user.id, displayName: user.displayName })
          .from(user)
          .where(input.id ? eq(user.id, input.id) : ilike(user.displayName, q))
          .orderBy(asc(user.displayName), user.id)
          .limit(input.limit + 1)
          .offset(input.offset);
      } else if (input.kind === 'tournament') {
        rows = await database
          .select({ id: tournament.id, name: tournament.name, date: tournament.date })
          .from(tournament)
          .where(input.id ? eq(tournament.id, input.id) : ilike(tournament.name, q))
          .orderBy(desc(tournament.date), tournament.id)
          .limit(input.limit + 1)
          .offset(input.offset);
      } else {
        rows = await database
          .select({ id: tournamentGroup.id, name: tournamentGroup.name })
          .from(tournamentGroup)
          .where(
            and(
              eq(tournamentGroup.visible, true),
              input.id ? eq(tournamentGroup.id, input.id) : ilike(tournamentGroup.name, q),
            ),
          )
          .orderBy(tournamentGroup.position, tournamentGroup.id)
          .limit(input.limit + 1)
          .offset(input.offset);
      }
      return {
        items: rows.slice(0, input.limit),
        hasMore: rows.length > input.limit,
        nextOffset: rows.length > input.limit ? input.offset + input.limit : null,
        visibilityNote:
          'References do not change visibility. Private resources remain private; associated deck subjects must be public. Pool embeds require a ready sealed/prerelease pool.',
      };
    },
    async templateDeck(actor: ArticleActor, id: string): Promise<TemplateDeck> {
      if (!actor.scopes.includes(MCP_DECK_SCOPE))
        throw new CreatorError('Approve decks:read to prepare templates from saved decks.', 403);
      const result = await createDeckRepository(database).getDeck(actor.userId, id);
      if (!result || 'tooLarge' in result)
        throw new CreatorError('Deck not found, unavailable or too large.', 404);
      return {
        deckId: result.deck.id,
        name: result.deck.name,
        format: result.deck.format,
        leaderIds: [result.deck.leaderCardId1, result.deck.leaderCardId2].filter(
          (id): id is string => !!id,
        ),
        baseId: result.deck.baseCardId,
        cards: result.contents,
      };
    },
    async images(actor: ArticleActor, page: number) {
      return images.list(actor.userId, page);
    },
    async upload(
      actor: ArticleActor,
      input: {
        requestId: string;
        fileName: string;
        mimeType: string;
        base64: string;
        purpose: 'image' | 'header';
      },
    ) {
      // Binary stays in the tool input only. Reject noncanonical encodings before allocating a File.
      if (input.base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(input.base64))
        throw new CreatorError('Use standard base64 without a data URL prefix.');
      const bytes = Buffer.from(input.base64, 'base64');
      if (bytes.toString('base64') !== input.base64)
        throw new CreatorError('Invalid base64 image.');
      if (!bytes.length || bytes.length > maxUserFileBytes)
        throw new CreatorError('Images must be nonempty and at most 10 MB.');
      let uploadedId: string | undefined;
      return withUserFileMutation(actor.userId, 'upload', async () => {
        const replayUpload = async (tx: Database, result: Record<string, unknown>) => {
          const [file] = await tx
            .select({ id: userFile.id })
            .from(userFile)
            .where(and(eq(userFile.id, String(result.id)), eq(userFile.userId, actor.userId)));
          if (!file)
            throw new CreatorError(
              'The uploaded image was removed. Use a new requestId for a new upload.',
              409,
            );
        };
        try {
          let receipt = await readMutationReceipt<{ id: string }>(
            database,
            actor,
            'upload_article_image',
            input.requestId,
            input,
            replayUpload,
          );
          if (!receipt) {
            if (!storage.available())
              throw new CreatorError('Image storage is not configured.', 503);
            const inputFile = new File([bytes], input.fileName, { type: input.mimeType });
            // CPU work must not occupy a pooled database connection.
            const prepared = await optimizeUserImage(
              inputFile,
              input.purpose === 'header' ? { preserveWidth: recommendedHeaderImageWidth } : {},
            );
            receipt = await mutation(
              database,
              actor,
              'upload_article_image',
              input.requestId,
              input,
              async tx => {
                const file = await createUserFileService(tx, storage, mcpPrepareImageQuota).create(
                  actor.userId,
                  inputFile,
                  input.purpose,
                  prepared,
                );
                uploadedId = file.id;
                return { id: file.id };
              },
              replayUpload,
            );
          }
          const [file] = await database
            .select()
            .from(userFile)
            .where(and(eq(userFile.id, receipt.id), eq(userFile.userId, actor.userId)));
          if (!file) throw new CreatorError('Image no longer available.', 404);
          return {
            id: file.id,
            fileName: file.fileName,
            width: file.width,
            height: file.height,
            byteSize: file.byteSize,
            url: storage.publicUrl(file.imageKey),
            thumbnailUrl: storage.publicUrl(file.thumbnailKey),
          };
        } catch (error) {
          if (uploadedId) {
            // If the outer receipt transaction failed, remove its orphaned objects.
            // A committed row always wins, including an uncertain commit response.
            const [saved] = await database
              .select({ id: userFile.id })
              .from(userFile)
              .where(eq(userFile.id, uploadedId));
            if (!saved)
              await Promise.allSettled(
                Object.values(userFileObjectKeys(actor.userId, uploadedId)).map(key =>
                  storage.remove(key),
                ),
              );
          }
          throw error;
        }
      });
    },
  };
}
