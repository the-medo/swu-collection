import { expect, test } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { db } from '../../db';
import { user, session } from '../../db/schema/auth-schema.ts';
import { userReport } from '../../db/schema/user_report.ts';
import { userReportAction } from '../../db/schema/user_report_action.ts';
import { createReportModerationService } from './moderation.ts';
import { createReportModerationRoute } from '../../routes/admin/user-reports/index.ts';
import type { AuthExtension } from '../../auth/auth.ts';
import type { ModerationActionInput } from '../../../shared/types/userReportModeration.ts';

const enabled = process.env.SWUBASE_USER_REPORTS_DB_TEST === '1';
if (enabled) {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
    throw new Error('Moderation tests require an isolated worktree database.');
}
const service = createReportModerationService(db);
async function fixture() {
  const ids = ['admin', 'admin2', 'reporter', 'target', 'moderator', 'organizer'].map(
    role => `${role}-moderation-test-${crypto.randomUUID()}`,
  );
  const [admin, admin2, reporter, target, moderator, organizer] = ids as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  await db.insert(user).values(
    ids.map((id, i) => ({
      id,
      name: id,
      displayName: id,
      email: `${id}@invalid.local`,
      emailVerified: false,
      currency: 'USD',
      createdAt: new Date(),
      updatedAt: new Date(),
      role: i < 2 ? 'user,admin' : i === 4 ? 'moderator' : i === 5 ? 'organizer' : 'user',
    })),
  );
  const reports: string[] = [];
  const report = async (reported = target, sender = reporter) => {
    const id = crypto.randomUUID();
    reports.push(id);
    await db.insert(userReport).values({
      id,
      reporterUserId: sender,
      reportedUserId: reported,
      reporterIdAtSubmission: sender,
      reportedIdAtSubmission: reported,
      reporterDisplayName: sender,
      reportedDisplayName: reported,
      clientReportId: crypto.randomUUID(),
      description: 'Private evidence.',
      source: 'profile',
    });
    return id;
  };
  const addSession = async () => {
    const id = crypto.randomUUID();
    await db.insert(session).values({
      id,
      token: crypto.randomUUID(),
      userId: target,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
    });
    return id;
  };
  const cleanup = async () => {
    if (reports.length) await db.delete(userReport).where(inArray(userReport.id, reports));
    await db.delete(user).where(inArray(user.id, ids));
  };
  return { admin, admin2, reporter, target, moderator, organizer, report, addSession, cleanup };
}
const decision = (patch: Partial<ModerationActionInput> = {}): ModerationActionInput => ({
  clientActionId: crypto.randomUUID(),
  revision: 0,
  action: 'suspend',
  target: 'reported',
  reason: 'Confirmed harassment.',
  durationDays: 7,
  ...patch,
});

test.skipIf(!enabled)(
  'moderation atomically suspends/revokes, deduplicates decisions, restores, reopens and bans',
  async () => {
    const f = await fixture();
    try {
      const id = await f.report();
      await f.addSession();
      await f.addSession();
      const input = decision();
      const results = await Promise.all([
        service.act(f.admin, id, input),
        service.act(f.admin, id, input),
      ]);
      expect(results[0]).toEqual(results[1]);
      const account = (await db.select().from(user).where(eq(user.id, f.target)))[0]!;
      expect(account.banned).toBe(true);
      expect(account.banReason).toBe(input.reason);
      expect(account.banExpires!.getTime()).toBeGreaterThan(Date.now() + 6 * 86400000);
      expect(await db.select().from(session).where(eq(session.userId, f.target))).toHaveLength(0);
      let detail = await service.detail(id);
      expect(detail.report).toMatchObject({ status: 'resolved', revision: 1 });
      expect(detail.actions).toHaveLength(1);
      expect(detail.reported?.restriction).toBe('suspended');
      await expect(service.act(f.admin, id, { ...input, reason: 'Changed' })).rejects.toMatchObject(
        { status: 409 },
      );
      await service.act(
        f.admin,
        id,
        decision({ revision: 1, action: 'restore', durationDays: undefined }),
      );
      expect((await service.profile(f.target)).restriction).toBe('none');
      await service.act(
        f.admin,
        id,
        decision({ revision: 2, action: 'reopen', durationDays: undefined }),
      );
      await service.act(
        f.admin,
        id,
        decision({ revision: 3, action: 'ban', durationDays: undefined }),
      );
      detail = await service.detail(id);
      expect(detail.report).toMatchObject({ status: 'resolved', revision: 4 });
      expect(detail.reported).toMatchObject({ restriction: 'banned', expiresAt: null });
      expect((await service.history(f.target, 1)).total).toBe(4);
      // Current names/status may change, while audit evidence stays intact after deletion.
      await db.update(user).set({ displayName: 'Renamed account' }).where(eq(user.id, f.target));
      await db.delete(user).where(inArray(user.id, [f.target, f.admin]));
      detail = await service.detail(id);
      expect(detail.reported).toMatchObject({
        exists: false,
        counts: { received: 1, openReceived: 0 },
      });
      expect(detail.actions[0]).toMatchObject({
        actorIdAtAction: f.admin,
        actorDisplayName: f.admin,
        targetIdAtAction: f.target,
        targetDisplayName: f.target,
      });
      expect((await service.history(f.target, 1)).total).toBe(4);
      expect(
        (await service.list({ userId: f.target, status: 'all', direction: 'received', page: 1 }))
          .total,
      ).toBe(1);
    } finally {
      await f.cleanup();
    }
  },
);

test.skipIf(!enabled)(
  'stale concurrent decisions conflict, restrictions cannot shrink, and database failures roll back',
  async () => {
    const f = await fixture();
    try {
      const id = await f.report();
      const results = await Promise.allSettled([
        service.act(f.admin, id, decision()),
        service.act(f.admin2, id, decision({ action: 'ban', durationDays: undefined })),
      ]);
      expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
      const failed = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
      expect(failed.reason.status).toBe(409);
      const id2 = await f.report();
      await expect(service.act(f.admin, id2, decision({ durationDays: 1 }))).rejects.toMatchObject({
        status: 409,
      });
      expect((await service.detail(id2)).report.status).toBe('open');
      await service.act(
        f.admin,
        id,
        decision({ revision: 1, action: 'restore', durationDays: undefined }),
      );
      await f.addSession();
      // The audit constraint fails after the account write; neither may survive alone.
      await expect(service.act(f.admin, id2, decision({ reason: '' }))).rejects.toThrow();
      expect((await service.profile(f.target)).restriction).toBe('none');
      expect(await db.select().from(session).where(eq(session.userId, f.target))).toHaveLength(1);
      expect((await service.detail(id2)).actions).toHaveLength(0);
      await db
        .update(user)
        .set({ banned: true, banExpires: new Date(Date.now() - 1000) })
        .where(eq(user.id, f.target));
      expect((await service.profile(f.target)).restriction).toBe('none');
    } finally {
      await f.cleanup();
    }
  },
);

test.skipIf(!enabled)(
  'admin policy protects accounts and supports acting on abusive reporters',
  async () => {
    const f = await fixture();
    try {
      const id = await f.report();
      for (const actor of [f.reporter, f.moderator, f.organizer])
        await expect(service.act(actor, id, decision())).rejects.toMatchObject({ status: 403 });
      const own = await f.report(f.admin);
      await expect(service.act(f.admin, own, decision())).rejects.toMatchObject({ status: 403 });
      await expect(service.act(f.admin2, own, decision())).rejects.toMatchObject({ status: 403 });
      await service.act(
        f.admin,
        id,
        decision({ target: 'reporter', action: 'ban', durationDays: undefined }),
      );
      expect((await service.profile(f.reporter)).restriction).toBe('banned');
      expect((await service.profile(f.target)).restriction).toBe('none');
      const deleted = await f.report();
      await db.delete(user).where(eq(user.id, f.target));
      await expect(service.act(f.admin, deleted, decision())).rejects.toMatchObject({
        status: 409,
      });
      await service.act(f.admin, deleted, decision({ action: 'dismiss', durationDays: undefined }));
      expect((await service.detail(deleted)).report.status).toBe('resolved');
      expect((await service.history(f.target, 1)).actions[0]).toMatchObject({
        action: 'dismiss',
        targetIdAtAction: f.target,
      });
      expect(
        (await service.list({ userId: f.reporter, direction: 'sent', status: 'resolved', page: 1 }))
          .total,
      ).toBe(2);
    } finally {
      await f.cleanup();
    }
  },
);

test.skipIf(!enabled)(
  'real admin route rejects anonymous/ordinary/moderator/organizer callers, validates input, and keeps histories private',
  async () => {
    const f = await fixture();
    try {
      const id = await f.report();
      const app = new Hono<AuthExtension>()
        .use('*', async (c, next) => {
          const actorId = c.req.header('Test-Actor');
          c.set(
            'user',
            actorId ? ({ id: actorId } as NonNullable<AuthExtension['Variables']['user']>) : null,
          );
          await next();
        })
        .route('/reports', createReportModerationRoute(service));
      for (const actor of [undefined, f.reporter, f.moderator, f.organizer]) {
        for (const path of [
          '/reports',
          `/reports/${id}`,
          `/reports/users/${f.target}`,
          `/reports/users/${f.target}/actions`,
        ]) {
          const response = await app.request(path, {
            headers: actor ? { 'Test-Actor': actor } : {},
          });
          expect(response.status).toBe(actor ? 403 : 401);
          expect(response.headers.get('cache-control')).toBe('private, no-store');
          expect(await response.text()).not.toContain('Private evidence');
        }
        const response = await app.request(`/reports/${id}/actions`, {
          method: 'POST',
          headers: {
            ...(actor ? { 'Test-Actor': actor } : {}),
            'Content-Type': 'application/json',
            'X-Requested-With': 'swubase',
          },
          body: JSON.stringify(decision()),
        });
        expect(response.status).toBe(actor ? 403 : 401);
      }
      const headers = {
        'Test-Actor': f.admin,
        'Content-Type': 'application/json',
        'X-Requested-With': 'swubase',
      };
      expect((await app.request('/reports?status=all', { headers })).status).toBe(200);
      expect((await app.request('/reports?status=invalid', { headers })).status).toBe(400);
      expect((await app.request('/reports/not-a-uuid', { headers })).status).toBe(400);
      for (const body of [
        decision({ reason: '  ' }),
        decision({ durationDays: 0 }),
        decision({ durationDays: undefined }),
        { ...decision(), actorId: f.admin2 },
        decision({ action: 'ban' }),
      ])
        expect(
          (
            await app.request(`/reports/${id}/actions`, {
              method: 'POST',
              headers,
              body: JSON.stringify(body),
            })
          ).status,
        ).toBe(400);
      expect(
        (
          await app.request(`/reports/${id}/actions`, {
            method: 'POST',
            headers: { ...headers, 'X-Requested-With': '' },
            body: JSON.stringify(decision()),
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await app.request(`/reports/${id}/actions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(decision()),
          })
        ).status,
      ).toBe(200);
    } finally {
      await f.cleanup();
    }
  },
);
