import { createHash } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { collection } from '../../db/schema/collection.ts';
import { collectionCard } from '../../db/schema/collection_card.ts';
import { collectionImport, collectionImportRow } from '../../db/schema/collection_import.ts';
import type {
  CollectionCsvImportRequest,
  CollectionImportSummary,
} from '../../../types/CollectionImport.ts';
import { getMergedCardList } from '../cards/cardListProvider.ts';
import { assertCollectionTextAllowed } from '../moderation/content.ts';
import { updateCollectionUpdatedAt } from '../updateCollectionUpdatedAt.ts';
import { resolveCollectionImport } from './resolveCollectionImport.ts';
import { batchArray } from '../utils/batch.ts';

export class CollectionImportError extends Error {
  constructor(
    public status: 404 | 409,
    message: string,
  ) {
    super(message);
  }
}
class ImportAlreadyExists extends Error {}

// One saved count per duplicate identity, regardless of the number of source rows.
export const resolvedImportCopiesSql = sql<number>`(
  select coalesce(sum(groups.count), 0) from (
    select max(resolved_count) as count from collection_import_row
    where import_id = collection_import.id and resolved_count is not null
    group by match->>'cardId', match->>'variantId', match->>'isFoil'
  ) groups
)`.mapWith(Number);

export const pendingImportRowsSql = sql<number>`(
  select count(*) from collection_import_row
  where import_id = collection_import.id and completed_at is null
)`.mapWith(Number);

export function importSummary(
  row: typeof collectionImport.$inferSelect,
  resolvedCopies = 0,
  pendingRows = row.problemRows,
): CollectionImportSummary {
  const {
    id,
    collectionId,
    fileName,
    createdAt,
    totalRows,
    importedRows,
    importedCopies,
    problemRows,
  } = row;
  return {
    id,
    collectionId,
    fileName,
    createdAt: createdAt.toISOString(),
    resolvedCopies,
    totalRows,
    importedRows,
    importedCopies,
    problemRows,
    pendingRows,
  };
}

export async function importCollectionCsv(userId: string, input: CollectionCsvImportRequest) {
  const requestHash = createHash('sha256')
    .update(
      JSON.stringify({
        csv: input.csv,
        fileName: input.fileName ?? null,
        destination: input.destination,
      }),
    )
    .digest('hex');
  const existingImport = async () => {
    const [found] = await db
      .select({
        report: collectionImport,
        resolvedCopies: resolvedImportCopiesSql,
        pendingRows: pendingImportRowsSql,
      })
      .from(collectionImport)
      .innerJoin(collection, eq(collection.id, collectionImport.collectionId))
      .where(and(eq(collectionImport.id, input.requestId), eq(collection.userId, userId)));
    if (!found) return;
    if (found.report.requestHash !== requestHash)
      throw new CollectionImportError(
        409,
        'This import request was already used for different data. Start a new import.',
      );
    return importSummary(found.report, found.resolvedCopies, found.pendingRows);
  };
  const previous = await existingImport();
  if (previous) return previous;
  if (input.destination.type === 'existing') {
    const [owned] = await db
      .select({ id: collection.id })
      .from(collection)
      .where(and(eq(collection.id, input.destination.collectionId), eq(collection.userId, userId)));
    if (!owned) throw new CollectionImportError(404, 'Collection not found.');
  } else {
    assertCollectionTextAllowed({ title: input.destination.title, description: '' });
  }

  const resolved = resolveCollectionImport(input.csv, await getMergedCardList());
  const accepted = resolved.rows.filter(row => !row.problem && row.match);
  const problems = resolved.rows.filter(row => row.problem);
  try {
    return await db.transaction(async tx => {
      let collectionId: string;
      if (input.destination.type === 'new') {
        const [created] = await tx
          .insert(collection)
          .values({ userId, title: input.destination.title, collectionType: 1 })
          .returning({ id: collection.id });
        collectionId = created.id;
      } else {
        const [owned] = await tx
          .select({ id: collection.id })
          .from(collection)
          .where(
            and(eq(collection.id, input.destination.collectionId), eq(collection.userId, userId)),
          )
          .for('update');
        if (!owned) throw new CollectionImportError(404, 'Collection not found.');
        collectionId = owned.id;
      }
      const [report] = await tx
        .insert(collectionImport)
        .values({
          id: input.requestId,
          collectionId,
          requestHash,
          fileName: input.fileName ?? null,
          headers: resolved.headers,
          totalRows: resolved.rows.length,
          importedRows: accepted.length,
          importedCopies: accepted.reduce((total, row) => total + row.match!.count, 0),
          problemRows: problems.length,
        })
        .onConflictDoNothing()
        .returning();
      if (!report) throw new ImportAlreadyExists();

      for (const batch of batchArray(accepted, 1000)) {
        await tx
          .insert(collectionCard)
          .values(
            batch.map(row => ({
              collectionId,
              cardId: row.match!.cardId,
              variantId: row.match!.variantId,
              foil: row.match!.isFoil,
              condition: 1,
              language: 'EN',
              amount: row.match!.count,
            })),
          )
          .onConflictDoUpdate({
            target: [
              collectionCard.collectionId,
              collectionCard.cardId,
              collectionCard.variantId,
              collectionCard.foil,
              collectionCard.condition,
              collectionCard.language,
            ],
            set: { amount: sql`${collectionCard.amount} + EXCLUDED.amount` },
          });
      }
      for (const batch of batchArray(problems, 500)) {
        await tx.insert(collectionImportRow).values(
          batch.map(row => ({
            importId: report.id,
            rowNumber: row.rowNumber,
            values: row.values,
            raw: row.raw,
            problem: row.problem!,
            message: row.message,
            relatedRows: row.relatedRows,
            match: row.match,
          })),
        );
      }
      if (accepted.length) await updateCollectionUpdatedAt(collectionId, tx);
      return importSummary(report);
    });
  } catch (error) {
    if (!(error instanceof ImportAlreadyExists)) throw error;
    const previous = await existingImport();
    if (previous) return previous;
    throw new CollectionImportError(409, 'This import request is unavailable. Start a new import.');
  }
}
