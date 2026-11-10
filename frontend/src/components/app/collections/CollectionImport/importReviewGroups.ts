import {
  collectionImportMatchKey,
  type CollectionImportReviewRow,
} from '../../../../../../types/CollectionImport.ts';

export type ImportReviewGroup = {
  id: string;
  rows: CollectionImportReviewRow[];
  completed: boolean;
  resolvedCount: number | null;
};

export function groupImportReviewRows(rows: CollectionImportReviewRow[]): ImportReviewGroup[] {
  const groups = new Map<string, ImportReviewGroup>();
  for (const row of rows) {
    const key =
      row.problem === 'duplicate' && row.match ? collectionImportMatchKey(row.match) : row.id;
    const group = groups.get(key) ?? { id: row.id, rows: [], completed: true, resolvedCount: null };
    group.rows.push(row);
    group.completed &&= !!row.completedAt;
    group.resolvedCount ??= row.resolvedCount ?? null;
    groups.set(key, group);
  }
  return [...groups.values()];
}
