import { z } from 'zod';

export const collectionImportMaxBytes = 2 * 1024 * 1024;
export const collectionImportMaxRows = 10000;
export const collectionImportMaxResolvedCount = collectionImportMaxRows * 1000;
export const zResolveCollectionImportDuplicate = z
  .object({
    count: z.number().int().min(0).max(collectionImportMaxResolvedCount),
  })
  .strict();

export const zCollectionCsvImportRequest = z
  .object({
    requestId: z.guid(),
    csv: z.string().min(1).max(collectionImportMaxBytes),
    fileName: z.string().max(255).optional(),
    destination: z.discriminatedUnion('type', [
      z.object({ type: z.literal('new'), title: z.string().trim().min(3).max(255) }).strict(),
      z.object({ type: z.literal('existing'), collectionId: z.guid() }).strict(),
    ]),
  })
  .strict();

export type CollectionCsvImportRequest = z.infer<typeof zCollectionCsvImportRequest>;
export type CollectionImportProblem = 'duplicate' | 'unmatched' | 'ambiguous' | 'invalid';
export type CollectionImportMatch = {
  cardId: string;
  variantId: string;
  cardName: string;
  variantName: string;
  count: number;
  isFoil: boolean;
};

export type CollectionImportSummary = {
  id: string;
  collectionId: string;
  fileName: string | null;
  createdAt: string;
  totalRows: number;
  importedRows: number;
  importedCopies: number;
  resolvedCopies: number;
  problemRows: number;
  pendingRows: number;
};

export type CollectionImportReviewRow = {
  id: string;
  rowNumber: number;
  values: string[];
  raw: string;
  problem: CollectionImportProblem;
  message: string;
  relatedRows: number[];
  match: CollectionImportMatch | null;
  completedAt: string | null;
  resolvedCount: number | null;
};

export type CollectionImportReview = {
  import: CollectionImportSummary & { headers: string[] };
  collectionTitle: string;
  rows: CollectionImportReviewRow[];
};

export function collectionImportMatchKey(match: CollectionImportMatch): string {
  return JSON.stringify([match.cardId, match.variantId, match.isFoil]);
}

export function collectionImportResolvedCopies(
  rows: Pick<CollectionImportReviewRow, 'match' | 'resolvedCount'>[],
): number {
  const groups = new Map<string, number>();
  for (const row of rows) {
    if (row.match && row.resolvedCount !== null)
      groups.set(collectionImportMatchKey(row.match), row.resolvedCount);
  }
  return [...groups.values()].reduce((sum, count) => sum + count, 0);
}

/** Keep source identifiers intact; never treat a suffix as a numeric card number. */
export function collectionImportSwudbUrl(headers: string[], values: string[]): string | undefined {
  const field = (name: string) =>
    values[headers.findIndex(h => h.trim().toLowerCase() === name)]?.trim();
  const set = field('set');
  const number = field('cardnumber');
  if (!set || !number || !/^[a-z0-9]+$/i.test(set) || !/^[a-z0-9-]+$/i.test(number)) return;
  return `https://swudb.com/card/${encodeURIComponent(set.toUpperCase())}/${encodeURIComponent(number)}`;
}
