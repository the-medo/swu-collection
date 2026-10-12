import { and, eq, isNull, or, sql } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { discussion, discussionComment as comment } from '../../db/schema/discussion.ts';
import type {
  CommentCursor,
  DiscussionFeedKind,
  DiscussionFeedPage,
  DiscussionType,
  RecentDiscussion,
} from '../../../shared/types/discussions.ts';
import { discussionAttachmentEntries } from './attachments.ts';
import { discussionPreview } from './preview.ts';
import { forumThread } from '../../db/schema/forum_thread.ts';

export async function getRecentDiscussions(): Promise<RecentDiscussion[]> {
  return (await getDiscussionFeed({ kind: 'discussions', limit: 3 })).data;
}

export async function getDiscussionFeed({
  kind,
  limit,
  cursor,
  type,
}: {
  kind: DiscussionFeedKind;
  limit: number;
  cursor?: CommentCursor;
  type?: DiscussionType;
}): Promise<DiscussionFeedPage> {
  const attachments = discussionAttachmentEntries();
  const target = (field: 'name' | 'url') =>
    sql<string | null>`CASE ${sql.join(
      attachments.map(
        ([type, attachment]) =>
          sql`WHEN ${discussion.type} = ${type} THEN ${
            field === 'name'
              ? attachment.notificationTarget.name
              : attachment.notificationTarget.url(sql`${comment.id}`)
          }`,
      ),
      sql` `,
    )} ELSE NULL::text END`;
  const rows = await db
    .select({
      id: comment.id,
      discussionId: discussion.id,
      type: sql<DiscussionType>`${discussion.type}`,
      targetName: target('name'),
      targetUrl: target('url'),
      thumbnail: sql<RecentDiscussion['thumbnail']>`CASE ${sql.join(
        attachments.map(
          ([type, attachment]) =>
            sql`WHEN ${discussion.type} = ${type} THEN ${attachment.thumbnail}`,
        ),
        sql` `,
      )} ELSE NULL::jsonb END`,
      content: comment.content,
      createdAt: comment.createdAt,
      author: { id: user.id, displayName: user.displayName, image: user.image },
    })
    .from(comment)
    .innerJoin(discussion, eq(discussion.id, comment.discussionId))
    .leftJoin(user, eq(user.id, comment.authorId))
    .where(
      and(
        type ? eq(discussion.type, type) : undefined,
        kind === 'discussions' ? isNull(comment.parentId) : undefined,
        kind === 'discussions'
          ? sql`(${discussion.type} <> 'forum' OR EXISTS (SELECT 1 FROM ${forumThread}
              WHERE ${forumThread.discussionId} = ${discussion.id} AND ${forumThread.openingCommentId} = ${comment.id}))`
          : undefined,
        isNull(comment.deletedAt),
        cursor
          ? sql`(${comment.createdAt}, ${comment.id}) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`
          : undefined,
        or(
          ...attachments.map(([type, attachment]) =>
            and(eq(discussion.type, type), attachment.discoverable()),
          ),
        ),
      ),
    )
    // Replies and edits never move a thread ahead of newly started conversations.
    .orderBy(sql`${comment.createdAt} DESC NULLS LAST`, sql`${comment.id} DESC NULLS LAST`)
    .limit(limit + 1);
  const last = rows[limit - 1];
  return {
    data: rows
      .slice(0, limit)
      .flatMap(({ content, targetUrl, ...row }) =>
        targetUrl ? [{ ...row, targetUrl, preview: discussionPreview(content) }] : [],
      ),
    nextCursor:
      rows.length > limit && last
        ? JSON.stringify({ id: last.id, createdAt: last.createdAt })
        : null,
  };
}
