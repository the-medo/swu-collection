import { and, desc, eq, gte, ne, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { creation, creatorProfile } from '../../db/schema/creator_hub.ts';
import { creationReport as reports } from '../../db/schema/creation_report.ts';
import type {
  CreationReportDecision,
  CreationReportList,
} from '../../../shared/creators/reports.ts';
import type { Database } from './types.ts';
import { now } from './types.ts';
import { CreatorError } from './errors.ts';
import { publicCreation } from './list.ts';
import { removeCreatorPublication } from './publication.ts';

export function createCreationReportsService(database: Database = db) {
  const ownReport = (creationId: string, reporterId: string) =>
    and(
      eq(reports.creationId, creationId),
      eq(reports.reporterId, reporterId),
      eq(reports.status, 'open'),
    );
  return {
    async status(creationId: string, reporterId: string) {
      const [report] = await database
        .select({ id: reports.id })
        .from(reports)
        .where(ownReport(creationId, reporterId));
      return { reported: !!report };
    },
    async submit(creationId: string, reporterId: string, details: string, clientReportId: string) {
      return database.transaction(async tx => {
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtext('creation-reports'), hashtext(${reporterId}))`,
        );
        const [retried] = await tx
          .select()
          .from(reports)
          .where(
            and(eq(reports.reporterId, reporterId), eq(reports.clientReportId, clientReportId)),
          );
        if (retried) {
          if (retried.creationId !== creationId || retried.details !== details)
            throw new CreatorError(
              'This submission was already used for another report. Close and reopen the report dialog.',
              409,
            );
          return { id: retried.id, createdAt: retried.createdAt };
        }
        const [existing] = await tx
          .select({ id: reports.id, createdAt: reports.createdAt })
          .from(reports)
          .where(ownReport(creationId, reporterId));
        if (existing) return existing;
        const [item] = await tx
          .select()
          .from(creation)
          .where(and(eq(creation.id, creationId), publicCreation()))
          .for('update');
        if (!item?.published || item.published.medium !== 'video')
          throw new CreatorError('Published video not found.', 404);
        const recent = await tx
          .select({ id: reports.id })
          .from(reports)
          .where(
            and(
              eq(reports.reporterId, reporterId),
              gte(reports.createdAt, sql`now() - interval '24 hours'`),
            ),
          )
          .limit(10);
        if (recent.length >= 10)
          throw new CreatorError(
            'You can report up to ten videos in 24 hours. Please try again later.',
            429,
          );
        const [report] = await tx
          .insert(reports)
          .values({
            creationId,
            reporterId,
            clientReportId,
            details,
            title: item.published.title,
            sourceUrl: item.published.sourceUrl,
          })
          .returning({ id: reports.id, createdAt: reports.createdAt });
        return report;
      });
    },
    async list(status: 'open' | 'resolved', page: number): Promise<CreationReportList> {
      const rows = await database
        .select({
          id: reports.id,
          creationId: reports.creationId,
          title: sql<string>`coalesce(${creation.published}->>'title', ${reports.title})`,
          sourceUrl: sql<string>`coalesce(${creation.published}->>'sourceUrl', ${reports.sourceUrl})`,
          details: reports.details,
          status: reports.status,
          createdAt: reports.createdAt,
          resolvedAt: reports.resolvedAt,
          creatorName: sql<string>`${creatorProfile.profile}->>'name'`,
          publishedRevision: creation.publishedRevision,
        })
        .from(reports)
        .innerJoin(creation, eq(creation.id, reports.creationId))
        .innerJoin(creatorProfile, eq(creatorProfile.id, creation.creatorId))
        .where(status === 'open' ? eq(reports.status, 'open') : ne(reports.status, 'open'))
        .orderBy(desc(reports.createdAt), desc(reports.id))
        .limit(26)
        .offset((page - 1) * 25);
      return { items: rows.slice(0, 25), hasMore: rows.length > 25 };
    },
    async decide(reportId: string, actorId: string, input: CreationReportDecision) {
      return database.transaction(async tx => {
        const [target] = await tx
          .select({ creationId: reports.creationId })
          .from(reports)
          .where(eq(reports.id, reportId));
        if (!target) throw new CreatorError('Report not found.', 404);
        // Match submission/publication locking order; serialize all decisions for this video.
        const [item] = await tx
          .select()
          .from(creation)
          .where(eq(creation.id, target.creationId))
          .for('update');
        const [report] = await tx
          .select()
          .from(reports)
          .where(eq(reports.id, reportId))
          .for('update');
        if (!item || !report) throw new CreatorError('Report not found.', 404);
        const status = input.action === 'dismiss' ? 'dismissed' : 'unpublished';
        if (report.status === status) return true;
        if (report.status !== 'open')
          throw new CreatorError('This report has already been resolved. Refresh the queue.', 409);
        if (input.action === 'unpublish') {
          if (item.publishedRevision !== input.publishedRevision)
            throw new CreatorError(
              'The publication changed. Refresh and review it before unpublishing.',
              409,
            );
          await removeCreatorPublication(tx, item.id);
        }
        await tx
          .update(reports)
          .set({ status, resolvedAt: now(), resolvedBy: actorId })
          .where(
            input.action === 'dismiss'
              ? eq(reports.id, reportId)
              : and(eq(reports.creationId, item.id), eq(reports.status, 'open')),
          );
        return true;
      });
    },
  };
}
export const creationReportsService = createCreationReportsService();
