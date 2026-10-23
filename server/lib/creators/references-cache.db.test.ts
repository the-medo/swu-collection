import { expect, spyOn, test } from 'bun:test';
import { db } from '../../db/index.ts';
import { invalidatePreviewCardCache } from '../cards/cardListProvider.ts';
import { resolveReferences } from './references.ts';

test.skipIf(process.env.SWUBASE_TEMPLATE_DB_TEST !== '1')(
  'main-app reference resolution keeps its shared catalog cache across database and transaction callers',
  async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_'))
      throw new Error('Use an isolated worktree database.');
    invalidatePreviewCardCache();
    const reads = spyOn(db, 'select');
    const refs = [{ type: 'base' as const, id: 'echo-base', startSeconds: null }];
    try {
      expect(await resolveReferences(refs, db)).toHaveLength(1);
      expect(reads).toHaveBeenCalledTimes(1);
      await resolveReferences(refs, db);
      await db.transaction(async tx => {
        const transactionReads = spyOn(tx, 'select');
        try {
          expect(await resolveReferences(refs, tx)).toHaveLength(1);
          expect(transactionReads).not.toHaveBeenCalled();
        } finally {
          transactionReads.mockRestore();
        }
      });
      expect(reads).toHaveBeenCalledTimes(1);
    } finally {
      reads.mockRestore();
      invalidatePreviewCardCache();
    }
  },
);
