import { and, asc, eq, gte, or, sql } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { userReport } from '../../db/schema/user_report.ts';
import type { CreateUserReportInput } from '../../../shared/types/userReports.ts';
import {
  runUserReportDiscordAfterSave,
  type UserReportDiscordData,
} from '../discord/userReports.ts';

export class UserReportError extends Error {
  constructor(
    message: string,
    public status: 400 | 403 | 404 | 409 | 429,
    public retryAfter?: number,
  ) {
    super(message);
  }
}

export function createUserReportService(
  database = db,
  notify: (data: UserReportDiscordData) => Promise<unknown> = runUserReportDiscordAfterSave,
) {
  return async (reporterUserId: string, input: CreateUserReportInput) => {
    if (reporterUserId === input.reportedUserId)
      throw new UserReportError('You cannot report yourself.', 400);
    if (input.reportedUserId === 'swubase' || reporterUserId === 'swubase')
      throw new UserReportError('This account cannot be reported.', 403);

    const saved = await database.transaction(async tx => {
      // Serialize this user's checks and insert across all backend instances.
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext('user-reports'), hashtext(${reporterUserId}))`,
      );
      const [existing] = await tx
        .select()
        .from(userReport)
        .where(
          and(
            eq(userReport.reporterUserId, reporterUserId),
            eq(userReport.clientReportId, input.clientReportId),
          ),
        );
      if (existing) {
        if (
          (existing.reportedIdAtSubmission ?? existing.reportedUserId) !== input.reportedUserId ||
          existing.description !== input.description ||
          existing.source !== input.source
        )
          throw new UserReportError(
            'This submission was already used for another report. Close and reopen the report dialog.',
            409,
          );
        return { report: existing, notification: null };
      }
      const [reporter] = await tx
        .select({ id: user.id, displayName: user.displayName })
        .from(user)
        .where(eq(user.id, reporterUserId))
        .for('key share');
      const [reported] = await tx
        .select({ id: user.id, displayName: user.displayName })
        .from(user)
        .where(eq(user.id, input.reportedUserId))
        .for('key share');
      if (!reporter || !reported) throw new UserReportError('User not found.', 404);
      const recent = await tx
        .select({ createdAt: userReport.createdAt })
        .from(userReport)
        .where(
          and(
            eq(userReport.reporterUserId, reporterUserId),
            gte(userReport.createdAt, sql`now() - interval '24 hours'`),
          ),
        )
        .orderBy(asc(userReport.createdAt))
        .limit(5);
      if (recent.length >= 5) {
        const retryAfter = Math.max(
          1,
          Math.ceil((recent[0]!.createdAt.getTime() + 86_400_000 - Date.now()) / 1000),
        );
        throw new UserReportError(
          'You can submit up to five reports in 24 hours. Please try again later.',
          429,
          retryAfter,
        );
      }
      const [report] = await tx
        .insert(userReport)
        .values({
          reporterUserId,
          ...input,
          reporterIdAtSubmission: reporter.id,
          reportedIdAtSubmission: reported.id,
          reporterDisplayName: reporter.displayName,
          reportedDisplayName: reported.displayName,
        })
        .returning();
      const historyFor = async (id: string) => {
        const sent = or(
          eq(userReport.reporterIdAtSubmission, id),
          eq(userReport.reporterUserId, id),
        )!;
        const received = or(
          eq(userReport.reportedIdAtSubmission, id),
          eq(userReport.reportedUserId, id),
        )!;
        const [counts] = await tx
          .select({
            sent: sql<number>`count(*) filter (where ${sent})`.mapWith(Number),
            received: sql<number>`count(*) filter (where ${received})`.mapWith(Number),
            openReceived:
              sql<number>`count(*) filter (where ${received} and ${userReport.status} = 'open')`.mapWith(
                Number,
              ),
          })
          .from(userReport)
          .where(or(sent, received));
        return counts!;
      };
      const history = {
        reporter: await historyFor(reporter.id),
        reported: await historyFor(reported.id),
      };
      return { report: report!, notification: { report: report!, reporter, reported, history } };
    });
    // Discord is best effort after the durable report has committed, as with resource submissions.
    if (saved.notification)
      void notify(saved.notification).catch(() => {
        console.error(`[user reports] ${saved.report.id}: notification-failed`);
      });
    return { id: saved.report.id, createdAt: saved.report.createdAt.toISOString() };
  };
}

export const submitUserReport = createUserReportService();
