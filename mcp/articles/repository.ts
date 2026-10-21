import { articleWidgetWarnings } from './validation.ts';
import { and, desc, eq, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm';
import {
  creation,
  creationRevision,
  creatorMember,
  creatorProfile,
} from '../../server/db/schema/creator_hub.ts';
import { user } from '../../server/db/schema/auth-schema.ts';
import { createCreationsService } from '../../server/lib/creators/creations.ts';
import { createOwnershipService, personalArticles } from '../../server/lib/creators/ownership.ts';
import { requireCreationAccess, requireCreator } from '../../server/lib/creators/permissions.ts';
import { resolveReferences } from '../../server/lib/creators/references.ts';
import { assertCreationTextAllowed } from '../../server/lib/creators/moderation.ts';
import { CreatorError } from '../../server/lib/creators/errors.ts';
import type { Database } from '../../server/lib/creators/types.ts';
import { creationDocumentSchema, type CreationDocument } from '../../shared/creators/contracts.ts';
import { isPostEmpty } from '../../shared/posts/content.ts';
import {
  articleDocument,
  articleFields,
  articleOutline,
  blockOperation,
  editBlocks,
  freshBlockIds,
  readableArticle,
} from './content.ts';
import { articleCatalog } from './catalog.ts';
import { mcpLockUser } from './userLock.ts';
import { inputHash, mutation, readMutationReceipt, type ArticleActor } from './receipts.ts';
import type { z } from 'zod';

export async function ownedArticle(database: Database, actor: ArticleActor, id: string) {
  const [row] = await database.select().from(creation).where(eq(creation.id, id));
  if (!row || row.draft.medium !== 'article' || row.sourceVideoId)
    throw new CreatorError('Article not found or unavailable.', 404);
  await requireCreationAccess(database, row, actor.userId);
  return row;
}
type SavedArticle = { id: string; revision: number; ownershipRevision: number };
type Expected = { articleId: string; expectedRevision: number; expectedOwnershipRevision: number };
function checkRevision(row: typeof creation.$inferSelect, input: Expected) {
  if (
    row.revision !== input.expectedRevision ||
    row.ownershipRevision !== input.expectedOwnershipRevision
  )
    throw new CreatorError(
      'Article content or ownership changed. Read the current draft and reconcile before retrying with a new requestId.',
      409,
    );
}
const summaryColumns = {
  id: creation.id,
  creatorId: creation.creatorId,
  revision: creation.revision,
  ownershipRevision: creation.ownershipRevision,
  publishedRevision: creation.publishedRevision,
  publishedAt: creation.publishedAt,
  updatedAt: creation.updatedAt,
  title: sql<string>`${creation.draft}->>'title'`,
  summary: sql<string>`${creation.draft}->>'summary'`,
  language: sql<string>`${creation.draft}->>'language'`,
  tags: sql<string[]>`${creation.draft}->'tags'`,
};
const escaped = (q: string) => `%${q.replace(/[\\%_]/g, '\\$&')}%`;
export function createArticleRepository(database: Database, catalog = articleCatalog(database)) {
  const replay = async (tx: Database, actor: ArticleActor, result: Record<string, unknown>) => {
    await ownedArticle(tx, actor, String(result.id));
  };
  return {
    async workspace(actor: ArticleActor) {
      const [identity] = await database
        .select({ id: user.id, displayName: user.displayName })
        .from(user)
        .where(eq(user.id, actor.userId));
      const creators = await database
        .select({
          id: creatorProfile.id,
          slug: creatorProfile.slug,
          name: sql<string>`${creatorProfile.profile}->>'name'`,
          ownerId: creatorProfile.ownerId,
        })
        .from(creatorProfile)
        .where(
          and(
            isNotNull(creatorProfile.ownerId),
            or(
              eq(creatorProfile.ownerId, actor.userId),
              inArray(
                creatorProfile.id,
                database
                  .select({ id: creatorMember.creatorId })
                  .from(creatorMember)
                  .where(eq(creatorMember.userId, actor.userId)),
              ),
            ),
          ),
        );
      return {
        identity,
        personal: { creatorId: null },
        creators: creators.map(({ ownerId, ...creator }) => ({
          ...creator,
          canTransferPersonalArticles: ownerId === actor.userId,
        })),
        grantedScopes: actor.scopes,
      };
    },
    async list(
      actor: ArticleActor,
      input: {
        creatorId?: string | null;
        state: string;
        query?: string;
        language?: string;
        tag?: string;
        limit: number;
        offset: number;
      },
    ) {
      const access =
        input.creatorId === null
          ? personalArticles(actor.userId)
          : input.creatorId
            ? (await requireCreator(database, input.creatorId, actor.userId),
              eq(creation.creatorId, input.creatorId))
            : or(
                personalArticles(actor.userId),
                inArray(
                  creation.creatorId,
                  database
                    .select({ id: creatorProfile.id })
                    .from(creatorProfile)
                    .where(
                      and(
                        isNotNull(creatorProfile.ownerId),
                        or(
                          eq(creatorProfile.ownerId, actor.userId),
                          inArray(
                            creatorProfile.id,
                            database
                              .select({ id: creatorMember.creatorId })
                              .from(creatorMember)
                              .where(eq(creatorMember.userId, actor.userId)),
                          ),
                        ),
                      ),
                    ),
                ),
              );
      const rows = await database
        .select(summaryColumns)
        .from(creation)
        .where(
          and(
            access,
            sql`${creation.draft}->>'medium' = 'article'`,
            isNull(creation.sourceVideoId),
            input.query
              ? sql`${creation.draft}->>'title' ILIKE ${escaped(input.query)}`
              : undefined,
            input.language ? sql`${creation.draft}->>'language' = ${input.language}` : undefined,
            input.tag
              ? sql`${creation.draft}->'tags' @> ${JSON.stringify([input.tag])}::jsonb`
              : undefined,
            input.state === 'draft'
              ? isNull(creation.published)
              : input.state === 'published'
                ? isNotNull(creation.published)
                : input.state === 'unpublished-changes'
                  ? and(
                      isNotNull(creation.published),
                      sql`${creation.revision} <> ${creation.publishedRevision}`,
                    )
                  : undefined,
          ),
        )
        .orderBy(desc(creation.updatedAt), creation.id)
        .limit(input.limit + 1)
        .offset(input.offset);
      return {
        articles: rows.slice(0, input.limit),
        hasMore: rows.length > input.limit,
        nextOffset: rows.length > input.limit ? input.offset + input.limit : null,
      };
    },
    async get(
      actor: ArticleActor,
      input: {
        articleId: string;
        view: 'draft' | 'published' | 'revision';
        revision?: number;
        format: 'native' | 'readable' | 'outline';
      },
    ) {
      const row = await ownedArticle(database, actor, input.articleId);
      let document = row.draft,
        revision = row.revision;
      if (input.view === 'published') {
        if (!row.published) throw new CreatorError('This article is not published.', 404);
        document = row.published;
        revision = row.publishedRevision!;
      } else if (input.view === 'revision') {
        const [version] = await database
          .select()
          .from(creationRevision)
          .where(
            and(
              eq(creationRevision.creationId, row.id),
              eq(creationRevision.revision, input.revision ?? 0),
            ),
          );
        if (!version) throw new CreatorError('This revision is not retained.', 404);
        document = version.document;
        revision = version.revision;
      }
      return {
        id: row.id,
        creatorId: row.creatorId,
        revision,
        currentRevision: row.revision,
        ownershipRevision: row.ownershipRevision,
        publishedRevision: row.publishedRevision,
        publishedAt: row.publishedAt,
        hasUnpublishedChanges: row.revision !== row.publishedRevision,
        editorPath: `/creator-studio?creationId=${row.id}${row.creatorId ? `&creatorId=${row.creatorId}` : ''}`,
        ...(input.format === 'native'
          ? { document }
          : input.format === 'outline'
            ? { outline: articleOutline(document.body) }
            : {
                text: readableArticle(document),
                warning:
                  'Readable export uses widget labels/links and does not preserve all formatting. Use native JSON for lossless import.',
              }),
      };
    },
    async create(
      actor: ArticleActor,
      input: {
        requestId: string;
        creatorId: string | null;
        fields: z.infer<typeof articleFields>;
        duplicateArticleId?: string;
        importDocument?: Record<string, unknown>;
      },
    ) {
      const receipt = await readMutationReceipt<SavedArticle>(
        database,
        actor,
        'create_article',
        input.requestId,
        input,
        (tx, result) => replay(tx, actor, result),
      );
      if (receipt) return receipt;
      // Resolve the shared cache before taking a transaction connection. A cold
      // catalog must not queue behind four writes that are all waiting for it.
      const cards = await catalog();
      return mutation(
        database,
        actor,
        'create_article',
        input.requestId,
        input,
        async tx => {
          if (input.duplicateArticleId && input.importDocument)
            throw new CreatorError('Choose either duplication or import.');
          const imported = input.importDocument
            ? creationDocumentSchema.parse(input.importDocument)
            : undefined;
          if (imported && imported.medium !== 'article')
            throw new CreatorError('Only article documents can be imported.');
          const previous = input.duplicateArticleId
            ? (await ownedArticle(tx, actor, input.duplicateArticleId)).draft
            : imported;
          const document = articleDocument(input.fields, previous);
          document.body = freshBlockIds(document.body);
          return createCreationsService(tx, mcpLockUser, async () => cards).save(
            input.creatorId,
            actor.userId,
            document,
          );
        },
        (tx, result) => replay(tx, actor, result),
      );
    },
    async update(
      actor: ArticleActor,
      input: Expected & {
        requestId: string;
        fields?: z.infer<typeof articleFields>;
        operations?: z.infer<typeof blockOperation>[];
        restoreRevision?: number;
      },
    ) {
      const receipt = await readMutationReceipt<SavedArticle>(
        database,
        actor,
        'update_article',
        input.requestId,
        input,
        (tx, result) => replay(tx, actor, result),
      );
      if (receipt) return receipt;
      const cards = await catalog();
      return mutation(
        database,
        actor,
        'update_article',
        input.requestId,
        input,
        async tx => {
          const row = await ownedArticle(tx, actor, input.articleId);
          checkRevision(row, input);
          let document = articleDocument(input.fields ?? {}, row.draft);
          if (input.operations) document.body = editBlocks(document.body, input.operations);
          if (input.restoreRevision !== undefined) {
            const [version] = await tx
              .select()
              .from(creationRevision)
              .where(
                and(
                  eq(creationRevision.creationId, row.id),
                  eq(creationRevision.revision, input.restoreRevision),
                ),
              );
            if (!version) throw new CreatorError('This revision is not retained.', 404);
            if (version.document.medium !== 'article')
              throw new CreatorError('This revision is not an article.');
            document = creationDocumentSchema.parse(version.document);
          }
          return createCreationsService(tx, mcpLockUser, async () => cards).save(
            row.creatorId,
            actor.userId,
            document,
            row.id,
            row.revision,
            undefined,
            undefined,
            undefined,
            row.ownershipRevision,
          );
        },
        (tx, result) => replay(tx, actor, result),
      );
    },
    async publish(
      actor: ArticleActor,
      input: Expected & { requestId: string; unpublish: boolean },
    ) {
      const receipt = await readMutationReceipt<SavedArticle & { published: boolean }>(
        database,
        actor,
        'publish_article',
        input.requestId,
        input,
        (tx, result) => replay(tx, actor, result),
      );
      if (receipt) return receipt;
      const cards = await catalog();
      return mutation(
        database,
        actor,
        'publish_article',
        input.requestId,
        input,
        async tx => {
          const row = await ownedArticle(tx, actor, input.articleId);
          checkRevision(row, input);
          await createCreationsService(tx, mcpLockUser, async () => cards).publish(
            row.id,
            actor.userId,
            row.revision,
            input.unpublish,
            row.ownershipRevision,
          );
          return {
            id: row.id,
            revision: row.revision,
            ownershipRevision: row.ownershipRevision,
            published: !input.unpublish,
          };
        },
        (tx, result) => replay(tx, actor, result),
      );
    },
    async revisions(actor: ArticleActor, id: string) {
      await ownedArticle(database, actor, id);
      return {
        revisions: await database
          .select({ revision: creationRevision.revision, createdAt: creationRevision.createdAt })
          .from(creationRevision)
          .where(eq(creationRevision.creationId, id))
          .orderBy(desc(creationRevision.revision))
          .limit(32),
      };
    },
    async compare(actor: ArticleActor, id: string, fromRevision: number, toRevision: number) {
      await ownedArticle(database, actor, id);
      const rows = await database
        .select()
        .from(creationRevision)
        .where(
          and(
            eq(creationRevision.creationId, id),
            inArray(creationRevision.revision, [fromRevision, toRevision]),
          ),
        );
      const from = rows.find(row => row.revision === fromRevision),
        to = rows.find(row => row.revision === toRevision);
      if (!from || !to) throw new CreatorError('A requested revision is not retained.', 404);
      const keys = Object.keys(to.document) as (keyof CreationDocument)[];
      const changedFields = keys.filter(
        key => JSON.stringify(from.document[key]) !== JSON.stringify(to.document[key]),
      );
      return {
        fromRevision,
        toRevision,
        changedFields,
        before: articleOutline(from.document.body),
        after: articleOutline(to.document.body),
      };
    },
    async validate(
      actor: ArticleActor,
      input: { articleId?: string; fields?: z.infer<typeof articleFields> },
    ) {
      const row = input.articleId
        ? await ownedArticle(database, actor, input.articleId)
        : undefined;
      const document = articleDocument(input.fields ?? {}, row?.draft);
      const issues: { path: string; message: string }[] = [];
      if (isPostEmpty(document.body))
        issues.push({ path: 'body', message: 'Write your article before publishing.' });
      try {
        assertCreationTextAllowed(document);
      } catch (error) {
        if (error instanceof Error) issues.push({ path: 'document', message: error.message });
        else throw error;
      }
      const resolved = await resolveReferences(document.references, database, catalog);
      document.references.forEach((ref, index) => {
        if (!resolved.some(value => value.type === ref.type && value.id === ref.id))
          issues.push({
            path: `references.${index}`,
            message: 'Unavailable subject. Associated decks must be public.',
          });
      });
      return {
        widgetWarnings: await articleWidgetWarnings(database, document.body),
        validDraft: true,
        canPublish: issues.length === 0,
        publicationIssues: issues,
        outline: articleOutline(document.body),
      };
    },
    async previewTransfer(actor: ArticleActor, creatorId: string) {
      await requireCreator(database, creatorId, actor.userId, true);
      const articles = await database
        .select({ id: creation.id, ownershipRevision: creation.ownershipRevision })
        .from(creation)
        .where(personalArticles(actor.userId))
        .orderBy(creation.id);
      return {
        creatorId,
        count: articles.length,
        previewHash: inputHash(articles),
        articleIds: articles.slice(0, 100).map(row => row.id),
        truncated: articles.length > 100,
      };
    },
    async transfer(
      actor: ArticleActor,
      input: { requestId: string; creatorId: string; previewHash: string },
    ) {
      return mutation(
        database,
        actor,
        'transfer_personal_articles',
        input.requestId,
        input,
        async tx => {
          await mcpLockUser(tx, actor.userId);
          await requireCreator(tx, input.creatorId, actor.userId, true, true);
          const articles = await tx
            .select({ id: creation.id, ownershipRevision: creation.ownershipRevision })
            .from(creation)
            .where(personalArticles(actor.userId))
            .orderBy(creation.id);
          if (inputHash(articles) !== input.previewHash)
            throw new CreatorError(
              'Your personal article list changed. Preview the transfer again.',
              409,
            );
          return createOwnershipService(tx, mcpLockUser).transferArticles(
            actor.userId,
            input.creatorId,
            crypto.randomUUID(),
          );
        },
        async tx => {
          await requireCreator(tx, input.creatorId, actor.userId, true);
        },
      );
    },
  };
}
