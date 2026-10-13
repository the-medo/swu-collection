import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { eq, inArray, sql } from 'drizzle-orm';
import type { AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db/index.ts';
import { user } from '../../db/schema/auth-schema.ts';
import {
  creation,
  creationReference,
  creationTag,
  creatorProfile,
} from '../../db/schema/creator_hub.ts';
import { creationReport } from '../../db/schema/creation_report.ts';
import { createCreatorHubRoute } from '../../routes/creator-hub.ts';
import {
  creationDocumentSchema,
  creatorProfileSchema,
} from '../../../shared/creators/contracts.ts';
import { emptyPostDocument } from '../../../shared/posts/content.ts';
import { creatorService } from './service.ts';
import { creationReportsService as reports } from './reports.ts';
import { createWorkerStore } from './worker/store.ts';

test.skipIf(process.env.CREATOR_HUB_DB_TEST !== '1')(
  'video reports are private, deduplicated, rate limited and actionable only by administrators',
  async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_'))
      throw new Error('Use an isolated worktree database.');
    const users = ['owner', 'reporter', 'admin'].map(
      name => `creation-report-${name}-${crypto.randomUUID()}`,
    );
    const [owner, reporter, admin] = users;
    let creatorId: string | undefined;
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        const id = c.req.header('x-fixture-user');
        c.set('user', id ? ({ id } as NonNullable<AuthExtension['Variables']['user']>) : null);
        await next();
      })
      .route('/', createCreatorHubRoute());
    const request = (
      viewer: string | null,
      method: string,
      path: string,
      body?: unknown,
      csrf = true,
    ) =>
      app.request(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(viewer ? { 'x-fixture-user': viewer } : {}),
          ...(csrf ? { 'X-Requested-With': 'swubase' } : {}),
        },
        body:
          body === undefined
            ? undefined
            : JSON.stringify(
                method === 'POST' && path.startsWith('/creations/') && path.endsWith('/report')
                  ? { clientReportId: crypto.randomUUID(), ...(body as object) }
                  : body,
              ),
      });
    try {
      await db.insert(user).values(
        users.map((id, index) => ({
          id,
          name: 'Report fixture',
          displayName: id,
          email: `${id}@invalid.local`,
          emailVerified: false,
          currency: 'USD',
          role: index === 2 ? 'user,admin' : 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      const profile = await creatorService.saveProfile(
        owner,
        creatorProfileSchema.parse({
          slug: `reports-${crypto.randomUUID()}`,
          name: 'Video reports fixture',
          bio: emptyPostDocument(),
          languages: ['en'],
          specialties: [],
          links: [],
        }),
      );
      creatorId = profile.id;
      const doc = creationDocumentSchema.parse({
        title: 'Video reporting fixture',
        medium: 'video',
        sourceUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
        body: emptyPostDocument(),
        tags: ['purpose:discussion'],
        references: [],
        chapters: [],
      });
      const videos = [];
      for (let i = 0; i < 12; i++) {
        const row = await creatorService.save(creatorId, owner, doc);
        await creatorService.publish(row.id, owner, row.revision);
        videos.push(row);
      }
      const first = videos[0];
      const path = `/creations/${first.id}/report`;
      expect((await request(null, 'POST', path, {})).status).toBe(401);
      expect((await request(null, 'GET', path)).status).toBe(401);
      expect((await request(owner, 'POST', path, {}, false)).status).toBe(403);
      expect((await request(owner, 'POST', path, { details: 'x'.repeat(1001) })).status).toBe(400);
      expect((await request(owner, 'POST', '/creations/not-a-uuid/report', {})).status).toBe(400);
      const clientReportId = crypto.randomUUID();
      const submissions = await Promise.all(
        Array.from({ length: 4 }, () =>
          request(owner, 'POST', path, { clientReportId, details: 'A different card game.' }),
        ),
      );
      expect(submissions.every(r => r.status === 200)).toBe(true);
      const receipts = await Promise.all(submissions.map(r => r.json()));
      const reportId = receipts[0].data.id;
      expect(new Set(receipts.map(r => r.data.id)).size).toBe(1);
      expect(await reports.status(first.id, owner)).toEqual({ reported: true });
      expect(await reports.status(first.id, reporter)).toEqual({ reported: false });
      const publicContent = await (await request(null, 'GET', `/creations/${first.id}`)).text();
      expect(publicContent).not.toContain('A different card game.');
      expect(publicContent).not.toContain('reporterId');
      expect((await creatorService.get(first.id)).id).toBe(first.id);

      const draft = await creatorService.save(creatorId, owner, doc);
      expect((await request(owner, 'POST', `/creations/${draft.id}/report`, {})).status).toBe(404);
      const [article] = await db
        .insert(creation)
        .values({
          creatorId,
          draft: { ...doc, medium: 'article' },
          published: { ...doc, medium: 'article' },
        })
        .returning();
      expect((await request(owner, 'POST', `/creations/${article.id}/report`, {})).status).toBe(
        404,
      );
      const rateResponses = await Promise.all(
        videos.slice(1, 11).map(v => request(owner, 'POST', `/creations/${v.id}/report`, {})),
      );
      expect(rateResponses.filter(r => r.status === 200)).toHaveLength(9);
      expect(rateResponses.filter(r => r.status === 429)).toHaveLength(1);
      expect((await request(owner, 'POST', path, {})).status).toBe(200);

      expect((await request(null, 'GET', '/reports')).status).toBe(401);
      expect((await request(owner, 'GET', '/reports')).status).toBe(403);
      expect(
        (
          await request(owner, 'POST', `/reports/${reportId}`, {
            action: 'unpublish',
            publishedRevision: 1,
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await request(
            admin,
            'POST',
            `/reports/${reportId}`,
            { action: 'unpublish', publishedRevision: 1 },
            false,
          )
        ).status,
      ).toBe(403);
      const queue = await request(admin, 'GET', '/reports');
      expect(queue.status).toBe(200);
      expect(queue.headers.get('Cache-Control')).toBe('private, no-store');
      expect((await queue.json()).data.items.some((r: { id: string }) => r.id === reportId)).toBe(
        true,
      );

      const secondRequestId = crypto.randomUUID();
      const secondReport = await reports.submit(
        first.id,
        reporter,
        'Not a SWU video.',
        secondRequestId,
      );
      const changed = await creatorService.save(
        creatorId,
        owner,
        { ...doc, title: 'Updated video title' },
        first.id,
        1,
      );
      await creatorService.publish(first.id, owner, changed.revision);
      expect((await reports.list('open', 1)).items.find(r => r.id === reportId)?.title).toBe(
        'Updated video title',
      );
      expect(
        (
          await request(admin, 'POST', `/reports/${reportId}`, {
            action: 'unpublish',
            publishedRevision: 1,
          })
        ).status,
      ).toBe(409);
      expect(
        (
          await request(admin, 'POST', `/reports/${reportId}`, {
            action: 'unpublish',
            publishedRevision: 2,
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await request(admin, 'POST', `/reports/${reportId}`, {
            action: 'unpublish',
            publishedRevision: 2,
          })
        ).status,
      ).toBe(200);
      expect((await request(null, 'GET', `/creations/${first.id}`)).status).toBe(404);
      expect((await creatorService.get(first.id, owner, true)).document.title).toBe(
        'Updated video title',
      );
      expect(
        await db.select().from(creationTag).where(eq(creationTag.creationId, first.id)),
      ).toHaveLength(0);
      expect(
        await db.select().from(creationReference).where(eq(creationReference.creationId, first.id)),
      ).toHaveLength(0);
      const closed = await db
        .select()
        .from(creationReport)
        .where(eq(creationReport.creationId, first.id));
      expect(closed).toHaveLength(2);
      expect(
        closed.every(r => r.status === 'unpublished' && r.resolvedBy === admin && r.resolvedAt),
      ).toBe(true);
      expect(await reports.status(first.id, reporter)).toEqual({ reported: false });
      // Retrying the original request after resolution returns its receipt without reopening it.
      expect(
        (await reports.submit(first.id, reporter, 'Not a SWU video.', secondRequestId)).id,
      ).toBe(secondReport.id);
      expect(await reports.status(first.id, reporter)).toEqual({ reported: false });
      await expect(
        reports.submit(videos[1].id, reporter, 'Not a SWU video.', secondRequestId),
      ).rejects.toMatchObject({ status: 409 });
      await creatorService.publish(first.id, owner, changed.revision);
      const repeated = await reports.submit(
        first.id,
        reporter,
        'This video is still unrelated.',
        crypto.randomUUID(),
      );
      expect(repeated.id).not.toBe(secondReport.id);
      expect(await reports.status(first.id, reporter)).toEqual({ reported: true });
      expect((await reports.list('open', 1)).items.some(r => r.id === repeated.id)).toBe(true);
      await reports.decide(repeated.id, admin, {
        action: 'unpublish',
        publishedRevision: changed.revision,
      });
      const remaining = (await reports.list('open', 1)).items.find(
        r => r.creationId === videos[1].id,
      )!;
      expect(
        (
          await request(admin, 'POST', `/reports/${remaining.id}`, {
            action: 'dismiss',
            publishedRevision: 1,
          })
        ).status,
      ).toBe(200);
      expect((await creatorService.get(videos[1].id)).id).toBe(videos[1].id);
      expect(
        (
          await request(admin, 'POST', `/reports/${remaining.id}`, {
            action: 'unpublish',
            publishedRevision: 1,
          })
        ).status,
      ).toBe(409);

      // An unpublished imported creation and its terminal job remain deduplication tombstones.
      const videoId = crypto.randomUUID().replaceAll('-', '').slice(0, 11);
      await db.update(creation).set({ sourceVideoId: videoId }).where(eq(creation.id, first.id));
      const store = createWorkerStore();
      expect(await store.enqueue([{ videoId, creatorId, channelId: 'UC' + 'x'.repeat(22) }])).toBe(
        1,
      );
      const claim = (await store.claim(videoId))!;
      await store.finish(claim, 'skipped', 'existing_creation_preserved');
      expect(await store.enqueue([{ videoId, creatorId, channelId: claim.channelId }])).toBe(0);
      expect(await store.retry(videoId, true)).toEqual([]);

      await db.delete(user).where(eq(user.id, reporter));
      expect(
        (await db.select().from(creationReport).where(eq(creationReport.id, secondReport.id)))[0]
          .reporterId,
      ).toBeNull();
      const sanitize = await Bun.file(
        new URL('../../../scripts/remote-dev/sql/001-core-data.sql', import.meta.url),
      ).text();
      const block = sanitize.match(/DO \$creator_hub\$[\s\S]*?\$creator_hub\$;/)![0];
      await expect(
        db.transaction(async tx => {
          await tx.execute(sql.raw(block));
          expect(await tx.select().from(creationReport)).toHaveLength(0);
          throw new Error('rollback report sanitization');
        }),
      ).rejects.toThrow('rollback report sanitization');
    } finally {
      if (creatorId) await db.delete(creatorProfile).where(eq(creatorProfile.id, creatorId));
      await db.delete(user).where(inArray(user.id, users));
    }
  },
);
