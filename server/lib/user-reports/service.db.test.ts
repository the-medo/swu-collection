import { expect, test } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { userReport } from '../../db/schema/user_report.ts';
import { createUserReportService } from './service.ts';
import type { UserReportDiscordData } from '../discord/userReports.ts';

const enabled = process.env.SWUBASE_USER_REPORTS_DB_TEST === '1';
if (enabled) {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
    throw new Error('Reports tests require an isolated worktree database.');
}
test.skipIf(!enabled)(
  'durable reports deduplicate retries, limit concurrent submissions and survive Discord/account deletion',
  async () => {
    const reporter = `reporter-test-${crypto.randomUUID()}`,
      target = `target-test-${crypto.randomUUID()}`;
    const notifications: UserReportDiscordData[] = [];
    const reportIds: string[] = [];
    await db.insert(user).values(
      [reporter, target].map(id => ({
        id,
        name: id,
        displayName: id,
        email: `${id}@invalid.local`,
        emailVerified: false,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    );
    const submit = createUserReportService(db, async data => {
      notifications.push(data);
      throw new Error('Simulated Discord failure');
    });
    const input = {
      reportedUserId: target,
      description: 'Test report reason.',
      source: 'profile' as const,
      clientReportId: crypto.randomUUID(),
    };
    try {
      await expect(submit(reporter, { ...input, reportedUserId: reporter })).rejects.toMatchObject({
        status: 400,
      });
      await expect(submit(reporter, { ...input, reportedUserId: 'swubase' })).rejects.toMatchObject(
        { status: 403 },
      );
      await expect(
        submit(reporter, { ...input, reportedUserId: 'missing-report-target' }),
      ).rejects.toMatchObject({ status: 404 });
      const receipts = await Promise.all([submit(reporter, input), submit(reporter, input)]);
      reportIds.push(receipts[0]!.id);
      expect(receipts[0]).toEqual(receipts[1]);
      expect(notifications).toHaveLength(1);
      expect(notifications[0]!.history).toEqual({
        reporter: { sent: 1, received: 0, openReceived: 0 },
        reported: { sent: 0, received: 1, openReceived: 1 },
      });
      expect(notifications[0]!.report.id).toBe(receipts[0]!.id);
      expect(notifications[0]!.reporter.id).toBe(reporter);
      expect(
        (await db.select().from(userReport).where(eq(userReport.id, receipts[0]!.id)))[0]!
          .description,
      ).toBe(input.description);
      await expect(
        submit(reporter, { ...input, description: 'Changed request.' }),
      ).rejects.toMatchObject({ status: 409 });
      const more = await Promise.allSettled(
        Array.from({ length: 6 }, () =>
          submit(reporter, { ...input, clientReportId: crypto.randomUUID() }),
        ),
      );
      expect(more.filter(result => result.status === 'fulfilled')).toHaveLength(4);
      const rejected = more.filter(result => result.status === 'rejected');
      expect(rejected).toHaveLength(2);
      for (const result of rejected)
        if (result.status === 'rejected')
          expect(result.reason).toMatchObject({ status: 429, retryAfter: expect.any(Number) });
      expect(notifications).toHaveLength(5);
      expect(await submit(reporter, input)).toEqual(receipts[0]);
      const rows = await db
        .select()
        .from(userReport)
        .where(eq(userReport.reporterUserId, reporter));
      reportIds.push(...rows.map(row => row.id));
      await db
        .update(user)
        .set({ displayName: `Renamed ${target}` })
        .where(eq(user.id, target));
      expect(
        (await db.select().from(userReport).where(eq(userReport.id, receipts[0]!.id)))[0]!
          .reportedDisplayName,
      ).toBe(target);
      await db.delete(user).where(eq(user.id, target));
      expect(await submit(reporter, input)).toEqual(receipts[0]);
      await db.delete(user).where(eq(user.id, reporter));
      const retained = await db.select().from(userReport).where(eq(userReport.id, receipts[0]!.id));
      expect(retained[0]).toMatchObject({
        reporterUserId: null,
        reportedUserId: null,
        reporterIdAtSubmission: reporter,
        reportedIdAtSubmission: target,
        reporterDisplayName: reporter,
        reportedDisplayName: target,
        description: input.description,
      });
    } finally {
      await db.delete(userReport).where(eq(userReport.reporterUserId, reporter));
      if (reportIds.length) await db.delete(userReport).where(inArray(userReport.id, reportIds));
      await db.delete(user).where(inArray(user.id, [reporter, target]));
    }
  },
);
