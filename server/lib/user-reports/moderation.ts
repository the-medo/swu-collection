import { and, count, desc, eq, or, sql } from 'drizzle-orm';
import { db } from '../../db';
import { session, user } from '../../db/schema/auth-schema.ts';
import { userReport } from '../../db/schema/user_report.ts';
import { userReportAction } from '../../db/schema/user_report_action.ts';
import { hasRole } from '../../../shared/lib/auth/roles.ts';
import type {
  AdminUserReport,
  ModerationAction,
  ModerationActionInput,
  ModerationUser,
  ReportListInput,
  ReportPage,
  ReportDetail,
  ModerationActionPage,
} from '../../../shared/types/userReportModeration.ts';
import { UserReportError } from './service.ts';

const pageSize = 20;
const sentBy = (id: string) =>
  or(eq(userReport.reporterIdAtSubmission, id), eq(userReport.reporterUserId, id));
const receivedBy = (id: string) =>
  or(eq(userReport.reportedIdAtSubmission, id), eq(userReport.reportedUserId, id));
const reportDto = (row: typeof userReport.$inferSelect): AdminUserReport => {
  const { clientReportId: _request, ...report } = row;
  return {
    ...report,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
  };
};
const actionDto = (row: typeof userReportAction.$inferSelect): ModerationAction => ({
  id: row.id,
  reportId: row.reportId,
  actorIdAtAction: row.actorIdAtAction,
  actorDisplayName: row.actorDisplayName,
  targetIdAtAction: row.targetIdAtAction,
  targetDisplayName: row.targetDisplayName,
  action: row.action,
  reason: row.reason,
  expiresAt: row.expiresAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
});

export function createReportModerationService(database = db) {
  async function list(input: ReportListInput): Promise<ReportPage> {
    const where = and(
      input.status === 'all' ? undefined : eq(userReport.status, input.status),
      input.userId
        ? input.direction === 'sent'
          ? sentBy(input.userId)
          : input.direction === 'received'
            ? receivedBy(input.userId)
            : or(sentBy(input.userId), receivedBy(input.userId))
        : undefined,
    );
    const [rows, [total]] = await Promise.all([
      database
        .select()
        .from(userReport)
        .where(where)
        .orderBy(desc(userReport.createdAt), desc(userReport.id))
        .limit(pageSize)
        .offset((input.page - 1) * pageSize),
      database.select({ value: count() }).from(userReport).where(where),
    ]);
    return { reports: rows.map(reportDto), total: total!.value, page: input.page, pageSize };
  }
  async function profile(id: string, fallbackName?: string | null): Promise<ModerationUser> {
    const [[account], [sent], [received], [open]] = await Promise.all([
      database
        .select({
          id: user.id,
          displayName: user.displayName,
          role: user.role,
          banned: user.banned,
          banExpires: user.banExpires,
        })
        .from(user)
        .where(eq(user.id, id)),
      database.select({ value: count() }).from(userReport).where(sentBy(id)),
      database.select({ value: count() }).from(userReport).where(receivedBy(id)),
      database
        .select({ value: count() })
        .from(userReport)
        .where(and(receivedBy(id), eq(userReport.status, 'open'))),
    ]);
    const active =
      !!account?.banned && (!account.banExpires || account.banExpires.getTime() > Date.now());
    return {
      id,
      displayName: account?.displayName ?? fallbackName ?? 'Deleted user',
      exists: !!account,
      protected: id === 'swubase' || hasRole(account?.role, 'admin'),
      restriction: active ? (account!.banExpires ? 'suspended' : 'banned') : 'none',
      expiresAt: active ? (account!.banExpires?.toISOString() ?? null) : null,
      counts: { sent: sent!.value, received: received!.value, openReceived: open!.value },
    };
  }
  async function history(id: string, page: number): Promise<ModerationActionPage> {
    const where = eq(userReportAction.targetIdAtAction, id);
    const [rows, [total]] = await Promise.all([
      database
        .select()
        .from(userReportAction)
        .where(where)
        .orderBy(desc(userReportAction.createdAt), desc(userReportAction.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      database.select({ value: count() }).from(userReportAction).where(where),
    ]);
    return { actions: rows.map(actionDto), total: total!.value, page, pageSize };
  }
  async function detail(id: string): Promise<ReportDetail> {
    const [report] = await database.select().from(userReport).where(eq(userReport.id, id));
    if (!report) throw new UserReportError('Report not found.', 404);
    const reporterId = report.reporterIdAtSubmission ?? report.reporterUserId;
    const reportedId = report.reportedIdAtSubmission ?? report.reportedUserId;
    const [reporter, reported, actions] = await Promise.all([
      reporterId ? profile(reporterId, report.reporterDisplayName) : null,
      reportedId ? profile(reportedId, report.reportedDisplayName) : null,
      database
        .select()
        .from(userReportAction)
        .where(eq(userReportAction.reportId, id))
        .orderBy(desc(userReportAction.createdAt), desc(userReportAction.id)),
    ]);
    return { report: reportDto(report), reporter, reported, actions: actions.map(actionDto) };
  }
  async function act(actorId: string, reportId: string, input: ModerationActionInput) {
    return database.transaction(async tx => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext('report-moderation'), hashtext(${input.clientActionId}))`,
      );
      const [actor] = await tx.select().from(user).where(eq(user.id, actorId));
      if (
        !actor ||
        !hasRole(actor.role, 'admin') ||
        (actor.banned && (!actor.banExpires || actor.banExpires > new Date()))
      )
        throw new UserReportError('Forbidden', 403);
      const [existing] = await tx
        .select()
        .from(userReportAction)
        .where(eq(userReportAction.id, input.clientActionId));
      if (existing) {
        if (
          existing.actorIdAtAction !== actorId ||
          existing.reportId !== reportId ||
          existing.action !== input.action ||
          existing.target !== input.target ||
          existing.reason !== input.reason ||
          existing.reportRevision !== input.revision ||
          existing.durationDays !== (input.durationDays ?? null)
        )
          throw new UserReportError(
            'This decision ID has already been used. Refresh and try again.',
            409,
          );
        return { id: existing.id };
      }
      const [report] = await tx
        .select()
        .from(userReport)
        .where(eq(userReport.id, reportId))
        .for('update');
      if (!report) throw new UserReportError('Report not found.', 404);
      if (report.revision !== input.revision)
        throw new UserReportError(
          'Another admin changed this report. Refresh before deciding.',
          409,
        );
      if (
        input.action === 'reopen'
          ? report.status !== 'resolved'
          : input.action !== 'restore' && report.status !== 'open'
      )
        throw new UserReportError('The report status has changed. Refresh before deciding.', 409);
      const affectsAccount = ['suspend', 'ban', 'restore'].includes(input.action);
      let target: typeof user.$inferSelect | undefined;
      const now = new Date();
      const expiresAt =
        input.action === 'suspend'
          ? new Date(now.getTime() + input.durationDays! * 86_400_000)
          : null;
      if (affectsAccount) {
        const targetId =
          input.target === 'reported' ? report.reportedUserId : report.reporterUserId;
        if (!targetId) throw new UserReportError('This account has been deleted.', 409);
        if (targetId === actorId || targetId === 'swubase')
          throw new UserReportError(
            'You cannot change access for yourself or the system account.',
            403,
          );
        [target] = await tx.select().from(user).where(eq(user.id, targetId)).for('update');
        if (!target) throw new UserReportError('User not found.', 404);
        if (hasRole(target.role, 'admin'))
          throw new UserReportError('Administrator accounts are protected.', 403);
        const restricted = target.banned && (!target.banExpires || target.banExpires > now);
        if (input.action === 'restore' && !restricted)
          throw new UserReportError('This account has no active restriction.', 409);
        // Never accidentally shorten an existing restriction from another report.
        if (
          input.action === 'suspend' &&
          restricted &&
          (!target.banExpires || target.banExpires >= expiresAt!)
        )
          throw new UserReportError(
            'This account already has an equal or longer restriction.',
            409,
          );
        if (input.action === 'ban' && restricted && !target.banExpires)
          throw new UserReportError('This account is already banned.', 409);
        await tx
          .update(user)
          .set({
            banned: input.action !== 'restore',
            banReason: input.action === 'restore' ? null : input.reason,
            banExpires: expiresAt,
            updatedAt: now,
          })
          .where(eq(user.id, targetId));
        // Better Auth uses this table directly; revocation takes effect across backend instances.
        if (input.action !== 'restore')
          await tx.delete(session).where(eq(session.userId, targetId));
      }
      const participantId =
        input.target === 'reported'
          ? (report.reportedIdAtSubmission ?? report.reportedUserId)
          : (report.reporterIdAtSubmission ?? report.reporterUserId);
      const participantName =
        input.target === 'reported' ? report.reportedDisplayName : report.reporterDisplayName;
      await tx.insert(userReportAction).values({
        id: input.clientActionId,
        reportId,
        actorUserId: actorId,
        actorIdAtAction: actorId,
        actorDisplayName: actor.displayName,
        targetUserId:
          target?.id ??
          (input.target === 'reported' ? report.reportedUserId : report.reporterUserId),
        targetIdAtAction: target?.id ?? participantId,
        targetDisplayName: target?.displayName ?? participantName,
        target: input.target,
        action: input.action,
        reason: input.reason,
        reportRevision: input.revision,
        durationDays: input.durationDays ?? null,
        expiresAt,
        createdAt: now,
      });
      const status =
        input.action === 'reopen'
          ? 'open'
          : input.action === 'restore'
            ? report.status
            : 'resolved';
      await tx
        .update(userReport)
        .set({
          status,
          revision: report.revision + 1,
          resolvedAt: status === 'open' ? null : (report.resolvedAt ?? now),
        })
        .where(eq(userReport.id, reportId));
      return { id: input.clientActionId };
    });
  }
  return { list, profile, history, detail, act };
}
export const reportModeration = createReportModerationService();
