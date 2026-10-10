import { and, eq, or, sql, type SQL } from 'drizzle-orm';
import { discussion, discussionComment } from '../../db/schema/discussion.ts';
import { discussionAttachmentEntries } from './attachments.ts';

// Notification reads use the same attachment access rules as comment reads,
// including current visibility/folder grants. Unknown types are never visible.
export function commentNotificationTarget(commentId: SQL, viewerId: SQL) {
  const entries = discussionAttachmentEntries();
  const readable =
    or(
      ...entries.map(([type, attachment]) =>
        and(eq(discussion.type, type), attachment.readable(viewerId)),
      ),
    ) ?? sql`false`;
  const select = (
    projection: SQL,
    requireAccess = false,
  ) => sql`(SELECT ${projection} FROM ${discussionComment}
    JOIN ${discussion} ON ${discussion.id} = ${discussionComment.discussionId}
    WHERE ${discussionComment.id} = ${commentId} AND ${discussionComment.deletedAt} IS NULL ${requireAccess ? sql`AND ${readable}` : sql``})`;
  // The inbox filters rows through visible in the same SQL statement/snapshot,
  // so display projections need not repeat the resource access check.
  const field = (key: 'name' | 'url' | 'legacyDeckId') =>
    select(
      sql`CASE ${sql.join(
        entries.map(([type, attachment]) => {
          const value =
            key === 'url'
              ? attachment.notificationTarget.url(commentId)
              : (attachment.notificationTarget[key] ?? sql`NULL::text`);
          return sql`WHEN ${discussion.type} = ${type} THEN ${value}`;
        }),
        sql` `,
      )} ELSE NULL::text END`,
    );
  return {
    visible: sql`COALESCE(${select(sql`true`, true)}, false)`,
    name: field('name'),
    url: field('url'),
    legacyDeckId: field('legacyDeckId'),
  };
}
