// COLLECTION_IMPORT_DB_TEST=1 bun --env-file=.env.worktree test server/routes/collection/import/import.db.test.ts
import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { eq, inArray, sql } from 'drizzle-orm';
import type { AuthExtension } from '../../../auth/auth.ts';
import { db } from '../../../db/index.ts';
import { user } from '../../../db/schema/auth-schema.ts';
import { collection } from '../../../db/schema/collection.ts';
import { collectionCard } from '../../../db/schema/collection_card.ts';
import { collectionImport, collectionImportRow } from '../../../db/schema/collection_import.ts';
import { collectionCsvImportPostRoute } from './post.ts';
import { collectionImportsRoute } from '../_id/imports/index.ts';
import type {
  CollectionCsvImportRequest,
  CollectionImportReview,
  CollectionImportSummary,
} from '../../../../types/CollectionImport.ts';

const enabled = process.env.COLLECTION_IMPORT_DB_TEST === '1';
test.skipIf(!enabled)(
  'CSV imports persist review rows, skip complete duplicate groups, authorize owners and retry safely',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw Error('Use an isolated worktree database.');
    const ownerId = crypto.randomUUID();
    const outsiderId = crypto.randomUUID();
    let viewer: string | null = ownerId;
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        c.set(
          'user',
          viewer ? ({ id: viewer } as NonNullable<AuthExtension['Variables']['user']>) : null,
        );
        await next();
      })
      .route('/collection/import', collectionCsvImportPostRoute)
      .route('/collection/:id/imports', collectionImportsRoute);
    const request = (input: CollectionCsvImportRequest) =>
      app.request('/collection/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
    const review = (report: CollectionImportSummary) =>
      app.request(`/collection/${report.collectionId}/imports/${report.id}`);
    const patch = (report: CollectionImportSummary, rowId: string, completed: boolean) =>
      app.request(`/collection/${report.collectionId}/imports/${report.id}/rows/${rowId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
    const resolve = (report: CollectionImportSummary, rowId: string, count: number) =>
      app.request(
        `/collection/${report.collectionId}/imports/${report.id}/rows/${rowId}/resolve-duplicate`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ count }),
        },
      );
    const cardRows = (id: string) =>
      db.select().from(collectionCard).where(eq(collectionCard.collectionId, id));
    const input: CollectionCsvImportRequest = {
      requestId: crypto.randomUUID(),
      destination: { type: 'new', title: 'Import test collection' },
      fileName: 'test.csv',
      csv: 'Set,CardNumber,Count,IsFoil,Stamp,Note\r\nHMW,313,2,False,,first\r\nHMW,313,1,False,,second\r\nSEC,571,3,True,,\r\nSEC,571m,1,True,,\r\nHMWP,16,1,False,,\r\nUNKNOWN,001,2,True,Judge,"Extra, detail"\r\nSOR,001,0,False,,',
    };
    try {
      await db.insert(user).values(
        [ownerId, outsiderId].map(id => ({
          id,
          name: 'Import test',
          email: `${id}@invalid.local`,
          displayName: id,
          emailVerified: false,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      viewer = null;
      expect((await request(input)).status).toBe(401);
      viewer = ownerId;
      const response = await request(input);
      expect(response.status).toBe(201);
      const report = (await response.json()).data as CollectionImportSummary;
      expect(report).toMatchObject({
        totalRows: 7,
        importedRows: 2,
        importedCopies: 4,
        problemRows: 5,
        pendingRows: 5,
      });
      const cards = await cardRows(report.collectionId);
      expect(cards).toHaveLength(2);
      expect(cards.find(c => c.cardId === 'willrow-hood--on-the-run')?.amount).toBe(3);
      expect(cards.find(c => c.cardId === 'bardottan-ornithopter')).toBeUndefined();
      expect(cards.some(c => c.cardId === 'keeper-of-skara-nal--awoken')).toBe(false);
      const data = (await (await review(report)).json()).data as CollectionImportReview;
      expect(data.import.headers).toEqual([
        'Set',
        'CardNumber',
        'Count',
        'IsFoil',
        'Stamp',
        'Note',
      ]);
      expect(data.rows.map(r => r.problem)).toEqual([
        'duplicate',
        'duplicate',
        'unmatched',
        'unmatched',
        'invalid',
      ]);
      expect(data.rows[0].relatedRows).toEqual([3]);
      expect(data.rows[1].relatedRows).toEqual([2]);
      expect(data.rows[2].values).toEqual(['SEC', '571m', '1', 'True', '', '']);
      expect(data.rows[2].match).toBeNull();
      expect(data.rows[3].values).toEqual([
        'UNKNOWN',
        '001',
        '2',
        'True',
        'Judge',
        'Extra, detail',
      ]);
      expect(data.rows[3].raw).toBe('UNKNOWN,001,2,True,Judge,"Extra, detail"');
      expect((await patch(report, data.rows[0].id, true)).status).toBe(200);
      expect(
        ((await (await review(report)).json()).data as CollectionImportReview).rows[0].completedAt,
      ).not.toBeNull();
      expect(await cardRows(report.collectionId)).toEqual(cards);
      expect(
        ((await (await review(report)).json()).data as CollectionImportReview).import.pendingRows,
      ).toBe(3);
      expect(
        ((await (await review(report)).json()).data as CollectionImportReview).rows[1].completedAt,
      ).not.toBeNull();
      expect((await patch(report, data.rows[0].id, false)).status).toBe(200);
      expect(
        ((await (await review(report)).json()).data as CollectionImportReview).rows[0].completedAt,
      ).toBeNull();
      expect((await app.request(`/collection/${report.collectionId}/imports`)).status).toBe(200);
      expect((await review({ ...report, collectionId: crypto.randomUUID() })).status).toBe(404);
      expect((await patch(report, crypto.randomUUID(), true)).status).toBe(404);
      expect((await app.request('/collection/bad/imports')).status).toBe(400);
      for (const publicCollection of [false, true]) {
        await db
          .update(collection)
          .set({ public: publicCollection })
          .where(eq(collection.id, report.collectionId));
        viewer = outsiderId;
        expect((await review(report)).status).toBe(404);
        expect((await app.request(`/collection/${report.collectionId}/imports`)).status).toBe(404);
        expect((await patch(report, data.rows[0].id, true)).status).toBe(404);
        expect((await resolve(report, data.rows[0].id, 3)).status).toBe(404);
        expect(
          (
            await request({
              ...input,
              requestId: crypto.randomUUID(),
              destination: { type: 'existing', collectionId: report.collectionId },
            })
          ).status,
        ).toBe(404);
        viewer = null;
        expect((await review(report)).status).toBe(401);
        expect((await patch(report, data.rows[0].id, true)).status).toBe(401);
        expect((await resolve(report, data.rows[0].id, 3)).status).toBe(401);
        viewer = ownerId;
      }
      expect((await request(input)).status).toBe(201);
      expect(await cardRows(report.collectionId)).toEqual(cards);
      expect((await request({ ...input, csv: input.csv + '\nSOR,001,1,False,,' })).status).toBe(
        409,
      );

      const concurrent = { ...input, requestId: crypto.randomUUID() };
      const retries = await Promise.all([request(concurrent), request(concurrent)]);
      expect(retries.map(r => r.status)).toEqual([201, 201]);
      const reports = await Promise.all(
        retries.map(async r => (await r.json()).data as CollectionImportSummary),
      );
      expect(reports[0].collectionId).toBe(reports[1].collectionId);
      expect((await cardRows(reports[0].collectionId)).reduce((n, r) => n + r.amount, 0)).toBe(4);
      expect(await db.select().from(collection).where(eq(collection.userId, ownerId))).toHaveLength(
        2,
      );

      // A group can be resolved through either source row, exactly once, even
      // under concurrent requests. Preserve cards already owned and their metadata.
      for (const count of [-1, 1.5, 10000001])
        expect((await resolve(report, data.rows[0].id, count)).status).toBe(400);
      expect((await resolve(report, data.rows[2].id, 1)).status).toBe(409);
      expect((await resolve(reports[0], data.rows[0].id, 1)).status).toBe(404);
      const duplicate = data.rows[0].match!;
      await db.insert(collectionCard).values(
        [1, 2].map(condition => ({
          collectionId: report.collectionId,
          cardId: duplicate.cardId,
          variantId: duplicate.variantId,
          foil: duplicate.isFoil,
          condition,
          language: 'EN',
          amount: 7,
          amount2: 2,
          note: 'Keep my note',
        })),
      );
      await db
        .update(collection)
        .set({ updatedAt: new Date('2000-01-01') })
        .where(eq(collection.id, report.collectionId));
      const saves = await Promise.all(data.rows.slice(0, 2).map(row => resolve(report, row.id, 4)));
      expect(saves.map(response => response.status)).toEqual([200, 200]);
      const savedCards = await cardRows(report.collectionId);
      expect(
        savedCards.find(row => row.cardId === duplicate.cardId && row.condition === 1),
      ).toMatchObject({ amount: 11, amount2: 2, note: 'Keep my note' });
      expect(
        savedCards.find(row => row.cardId === duplicate.cardId && row.condition === 2)?.amount,
      ).toBe(7);
      const savedReview = ((await (await review(report)).json()).data as CollectionImportReview)
        .rows;
      expect(
        savedReview.slice(0, 2).every(row => row.resolvedCount === 4 && !!row.completedAt),
      ).toBe(true);
      expect(savedReview[0].values).toEqual(data.rows[0].values);
      expect(
        ((await (await review(report)).json()).data as CollectionImportReview).import
          .resolvedCopies,
      ).toBe(4);
      const history = (
        await (await app.request(`/collection/${report.collectionId}/imports`)).json()
      ).data as CollectionImportSummary[];
      expect(history.find(item => item.id === report.id)).toMatchObject({
        importedCopies: 4,
        resolvedCopies: 4,
        pendingRows: 3,
      });
      expect((await (await request(input)).json()).data.resolvedCopies).toBe(4);
      const [savedCollection] = await db
        .select()
        .from(collection)
        .where(eq(collection.id, report.collectionId));
      expect(savedCollection.updatedAt).not.toEqual(new Date('2000-01-01'));
      expect((await patch(report, data.rows[1].id, false)).status).toBe(200);
      expect(
        ((await (await review(report)).json()).data as CollectionImportReview).rows
          .slice(0, 2)
          .every(row => row.completedAt === null),
      ).toBe(true);
      expect((await resolve(report, data.rows[1].id, 4)).status).toBe(200);
      expect((await resolve(report, data.rows[0].id, 5)).status).toBe(409);
      expect(await cardRows(report.collectionId)).toEqual(savedCards);
      expect(
        (await db.select().from(collection).where(eq(collection.id, report.collectionId)))[0]
          .updatedAt,
      ).toEqual(savedCollection.updatedAt);
      const zeroReport = reports[0];
      const zeroRows = ((await (await review(zeroReport)).json()).data as CollectionImportReview)
        .rows;
      expect((await resolve(zeroReport, zeroRows[0].id, 0)).status).toBe(200);
      expect(
        ((await (await review(zeroReport)).json()).data as CollectionImportReview).rows
          .slice(0, 2)
          .every(row => row.resolvedCount === 0 && !!row.completedAt),
      ).toBe(true);
      expect(
        (await cardRows(zeroReport.collectionId)).some(row => row.cardId === duplicate.cardId),
      ).toBe(false);
      expect((await resolve(zeroReport, zeroRows[1].id, 1)).status).toBe(409);

      for (const type of [1, 2, 3]) {
        await db
          .update(collection)
          .set({ collectionType: type, updatedAt: new Date('2000-01-01') })
          .where(eq(collection.id, report.collectionId));
        const result = await request({
          requestId: crypto.randomUUID(),
          destination: { type: 'existing', collectionId: report.collectionId },
          csv: 'SOR,001,1,False',
        });
        expect(result.status).toBe(201);
        expect(
          (await db.select().from(collection).where(eq(collection.id, report.collectionId)))[0]
            .updatedAt,
        ).not.toEqual(new Date('2000-01-01'));
      }
      // Newer successful imports must not bury an unfinished review outside the
      // history's 100-report window. Completed and reopened counts are live.
      await db.insert(collectionImport).values(
        Array.from({ length: 105 }, (_, i) => ({
          id: crypto.randomUUID(),
          collectionId: report.collectionId,
          requestHash: `history-${i}`,
          headers: [],
          totalRows: 0,
          importedRows: 0,
          importedCopies: 0,
          problemRows: 0,
          createdAt: new Date(Date.now() + i + 1000),
        })),
      );
      const summaries = async () =>
        (await (await app.request(`/collection/${report.collectionId}/imports`)).json())
          .data as CollectionImportSummary[];
      expect((await summaries())[0]).toMatchObject({ id: report.id, pendingRows: 5 });
      const firstPage = await (
        await app.request(`/collection/${report.collectionId}/imports`)
      ).json();
      const secondPage = await (
        await app.request(`/collection/${report.collectionId}/imports?page=1`)
      ).json();
      expect(firstPage.data).toHaveLength(100);
      expect(firstPage.hasMore).toBe(true);
      expect(secondPage.data).toHaveLength(9);
      expect(secondPage.hasMore).toBe(false);
      expect(
        secondPage.data.every(
          (item: CollectionImportSummary) =>
            !firstPage.data.some((first: CollectionImportSummary) => first.id === item.id),
        ),
      ).toBe(true);
      expect((await app.request(`/collection/${report.collectionId}/imports?page=-1`)).status).toBe(
        400,
      );
      for (const row of data.rows) expect((await patch(report, row.id, true)).status).toBe(200);
      expect(
        ((await (await review(report)).json()).data as CollectionImportReview).import.pendingRows,
      ).toBe(0);
      expect((await summaries()).every(item => item.pendingRows === 0)).toBe(true);
      expect((await patch(report, data.rows[2].id, false)).status).toBe(200);
      expect((await summaries())[0]).toMatchObject({ id: report.id, pendingRows: 1 });
      const allUnmatched = await request({
        requestId: crypto.randomUUID(),
        destination: { type: 'new', title: 'Only unmatched' },
        csv: 'UNKNOWN,1,1,False',
      });
      expect(allUnmatched.status).toBe(201);
      const unmatchedReport = (await allUnmatched.json()).data as CollectionImportSummary;
      expect(await cardRows(unmatchedReport.collectionId)).toHaveLength(0);
      expect(
        ((await (await review(unmatchedReport)).json()).data as CollectionImportReview).rows,
      ).toHaveLength(1);
      expect(
        (
          await request({
            ...input,
            requestId: crypto.randomUUID(),
            csv: 'Set,CardNumber,Count,IsFoil',
          })
        ).status,
      ).toBe(400);

      // Execute the actual dump sanitizer block, then roll it back so other local
      // reports remain intact. No source CSV may survive in contributor dumps.
      const cleanupSql = await Bun.file('scripts/remote-dev/sql/001-core-data.sql').text();
      const importCleanup = cleanupSql.match(
        /DO \$collection_imports\$[\s\S]*?\$collection_imports\$;/,
      )?.[0];
      expect(importCleanup).toBeDefined();
      await expect(
        db.transaction(async tx => {
          await tx.execute(sql.raw(importCleanup!));
          expect(await tx.select().from(collectionImport)).toHaveLength(0);
          expect(await tx.select().from(collectionImportRow)).toHaveLength(0);
          expect(
            await tx.select().from(collection).where(eq(collection.id, report.collectionId)),
          ).toHaveLength(1);
          throw new Error('Roll back sanitizer test');
        }),
      ).rejects.toThrow('Roll back sanitizer test');

      // Deleting a collection must also remove its saved reports and source rows.
      const before = await db
        .select()
        .from(collectionImport)
        .where(eq(collectionImport.collectionId, report.collectionId));
      expect(before.length).toBeGreaterThan(0);
      await db.delete(collectionCard).where(eq(collectionCard.collectionId, report.collectionId));
      await db.delete(collection).where(eq(collection.id, report.collectionId));
      expect(
        await db
          .select()
          .from(collectionImport)
          .where(eq(collectionImport.collectionId, report.collectionId)),
      ).toHaveLength(0);
      expect(
        await db
          .select()
          .from(collectionImportRow)
          .where(eq(collectionImportRow.importId, report.id)),
      ).toHaveLength(0);
    } finally {
      const owned = await db
        .select({ id: collection.id })
        .from(collection)
        .where(inArray(collection.userId, [ownerId, outsiderId]));
      if (owned.length) {
        const ids = owned.map(c => c.id);
        await db.delete(collectionCard).where(inArray(collectionCard.collectionId, ids));
        await db.delete(collection).where(inArray(collection.id, ids));
      }
      await db.delete(user).where(inArray(user.id, [ownerId, outsiderId]));
    }
  },
);
