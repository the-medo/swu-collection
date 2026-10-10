import { getDiscussionAttachment, resolveDiscussionPolicy } from './attachments.ts';
import { and, count, eq, getTableColumns, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '../../db';
import { discussion, discussionComment as c } from '../../db/schema/discussion.ts';
import { user } from '../../db/schema/auth-schema.ts';
import { userNotification } from '../../db/schema/user_notification.ts';
import { createNotifications, type NewNotification } from '../notifications/write.ts';
import { notifyUser } from '../notifications/publish.ts';
import { emptyPostDocument, type PostDocument } from '../../../shared/posts/content.ts';
import type {
  CommentCursor,
  CommentsPage,
  DiscussionComment,
  DiscussionInfo,
  DiscussionThread,
  DiscussionTarget,
  DiscussionType,
} from '../../../shared/types/discussions.ts';
import type { DiscussionPolicy, DiscussionResult, DiscussionTransaction } from './policy.ts';
import { canonicalCommentReferences, prepareCommentReferences } from './references.ts';

const unavailable = {
  error: 'This discussion is unavailable, or you do not have access to it.',
  status: 404 as const,
};
const gone = { error: 'This comment was deleted. Your draft is still here.', status: 410 as const };
const conflict = {
  error: 'This was changed in another tab. Your draft is still here; choose which version to keep.',
  status: 409 as const,
};
const replyCount = sql<number>`(WITH RECURSIVE replies AS (
  SELECT first_reply.id, first_reply.deleted_at FROM discussion_comment first_reply
    WHERE first_reply.parent_id = ${c.id} AND first_reply.discussion_id = ${c.discussionId}
  UNION ALL SELECT child.id, child.deleted_at FROM discussion_comment child JOIN replies parent
    ON child.parent_id = parent.id AND child.discussion_id = ${c.discussionId}
) SELECT count(*)::int FROM replies WHERE deleted_at IS NULL)`;
const fields = {
  ...getTableColumns(c),
  replyCount,
  author: { id: user.id, displayName: user.displayName, image: user.image },
};
const visibleComment = sql`(${c.deletedAt} IS NULL OR ${replyCount} > 0)`;
const cursorFor = (row: DiscussionComment) =>
  JSON.stringify({ id: row.id, createdAt: row.createdAt });
const commentTotal = (id: string) =>
  sql<number>`(SELECT count(*)::int FROM discussion_comment WHERE discussion_id = ${id} AND deleted_at IS NULL)`;

async function lock(
  tx: DiscussionTransaction,
  id: string,
  policy: DiscussionPolicy,
  ownCommentId?: string,
) {
  const resource = await policy.lockResource(tx, id, ownCommentId);
  if (!resource) return;
  const [record] = await tx
    .select({ id: discussion.id })
    .from(discussion)
    .where(and(eq(discussion.id, id), policy.type ? eq(discussion.type, policy.type) : undefined))
    .for('update');
  return record ? resource : undefined;
}
async function readOne(
  database: typeof db | DiscussionTransaction,
  id: string,
  commentId: string,
  policy?: DiscussionPolicy,
) {
  const [row] = await database
    .select(fields)
    .from(c)
    .innerJoin(discussion, eq(discussion.id, c.discussionId))
    .leftJoin(user, eq(user.id, c.authorId))
    .where(and(eq(c.discussionId, id), eq(c.id, commentId), policy?.readable));
  return row;
}
export async function getDiscussionInfo(
  id: string,
  policy: DiscussionPolicy,
  database: typeof db | DiscussionTransaction = db,
): Promise<DiscussionResult<DiscussionInfo>> {
  const [row] = await database
    .select({
      id: discussion.id,
      canModerate: sql<boolean>`${policy.moderator}`,
      total: commentTotal(id),
    })
    .from(discussion)
    .where(and(eq(discussion.id, id), policy.readable));
  return row ? { data: row } : unavailable;
}

async function includeSingleReplies(
  database: DiscussionTransaction,
  id: string,
  policy: DiscussionPolicy,
  comments: DiscussionComment[],
) {
  const parents = comments.filter(comment => comment.replyCount === 1).map(comment => comment.id);
  const byParent = new Map<string, DiscussionComment[]>();
  if (parents.length) {
    // One batch also covers deleted ancestors between a parent and its sole live reply.
    const descendants = sql`(WITH RECURSIVE replies AS (
      SELECT id FROM discussion_comment
        WHERE discussion_id = ${id} AND parent_id IN (${sql.join(
          parents.map(parent => sql`${parent}::uuid`),
          sql`, `,
        )})
      UNION ALL SELECT child.id FROM discussion_comment child JOIN replies parent
        ON child.parent_id = parent.id WHERE child.discussion_id = ${id}
    ) SELECT id FROM replies)`;
    const rows = await database
      .select(fields)
      .from(c)
      .innerJoin(discussion, eq(discussion.id, c.discussionId))
      .leftJoin(user, eq(user.id, c.authorId))
      .where(
        and(eq(c.discussionId, id), inArray(c.id, descendants), policy.readable, visibleComment),
      )
      .orderBy(c.createdAt, c.id);
    for (const row of rows) {
      const replies = byParent.get(row.parentId!) ?? [];
      replies.push(row);
      byParent.set(row.parentId!, replies);
    }
  }
  const include = (comment: DiscussionComment): DiscussionComment =>
    comment.replyCount <= 1
      ? { ...comment, replies: (byParent.get(comment.id) ?? []).map(include) }
      : comment;
  return comments.map(include);
}

export async function getComments(
  id: string,
  policy: DiscussionPolicy,
  cursor: CommentCursor | undefined,
  limit: number,
  parentId?: string,
): Promise<DiscussionResult<CommentsPage>> {
  return db.transaction(
    async database => {
      const access = await getDiscussionInfo(id, policy, database);
      if ('error' in access) return access;
      if (parentId && !(await readOne(database, id, parentId))) return gone;
      const rows = await database
        .select(fields)
        .from(c)
        .innerJoin(discussion, eq(discussion.id, c.discussionId))
        .leftJoin(user, eq(user.id, c.authorId))
        .where(
          and(
            eq(c.discussionId, id),
            policy.readable,
            parentId ? eq(c.parentId, parentId) : isNull(c.parentId),
            visibleComment,
            cursor
              ? parentId
                ? sql`(${c.createdAt}, ${c.id}) > (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`
                : sql`(${c.createdAt}, ${c.id}) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`
              : undefined,
          ),
        )
        .orderBy(
          parentId ? sql`${c.createdAt} ASC` : sql`${c.createdAt} DESC`,
          parentId ? sql`${c.id} ASC` : sql`${c.id} DESC`,
        )
        .limit(limit + 1);
      return {
        data: {
          data: await includeSingleReplies(database, id, policy, rows.slice(0, limit)),
          total: access.data.total,
          nextCursor: rows.length > limit ? cursorFor(rows[limit - 1]) : null,
        },
      };
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );
}
export async function getComment(
  id: string,
  commentId: string,
  policy: DiscussionPolicy,
): Promise<DiscussionResult<DiscussionComment>> {
  const access = await getDiscussionInfo(id, policy);
  if ('error' in access) return access;
  const row = await readOne(db, id, commentId, policy);
  return row && !row.deletedAt ? { data: row } : gone;
}
export async function getCommentThread(
  id: string,
  commentId: string,
  policy: DiscussionPolicy,
): Promise<DiscussionResult<DiscussionThread>> {
  const access = await getDiscussionInfo(id, policy);
  if ('error' in access) return access;
  const ids = await db.execute<{ id: string }>(sql`WITH RECURSIVE path AS (
    SELECT id, parent_id, depth FROM discussion_comment WHERE discussion_id = ${id} AND id = ${commentId} AND deleted_at IS NULL
    UNION ALL SELECT parent.id, parent.parent_id, parent.depth FROM discussion_comment parent JOIN path child
      ON parent.id = child.parent_id AND parent.discussion_id = ${id} AND parent.depth < child.depth
  ) SELECT id FROM path`);
  const missing = { error: 'This comment was deleted.', status: 410 as const };
  if (!ids.length) return missing;
  const path = await db
    .select(fields)
    .from(c)
    .innerJoin(discussion, eq(discussion.id, c.discussionId))
    .leftJoin(user, eq(user.id, c.authorId))
    .where(
      and(
        eq(c.discussionId, id),
        inArray(
          c.id,
          ids.map(row => row.id),
        ),
        policy.readable,
      ),
    )
    .orderBy(c.depth);
  if (!path.length) return unavailable;
  const target = path[path.length - 1];
  return target?.id === commentId && !target.deletedAt ? { data: { path } } : missing;
}

export async function getOwnComments(
  id: string,
  viewerId: string,
  cursor: CommentCursor | undefined,
  limit: number,
): Promise<{ data: CommentsPage }> {
  const owned = and(eq(c.discussionId, id), eq(c.authorId, viewerId), isNull(c.deletedAt));
  const [rows, totals] = await Promise.all([
    db
      .select({ ...fields, replyCount: sql<number>`0` })
      .from(c)
      .leftJoin(user, eq(user.id, c.authorId))
      .where(
        and(
          owned,
          cursor
            ? sql`(${c.createdAt}, ${c.id}) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`
            : undefined,
        ),
      )
      .orderBy(sql`${c.createdAt} DESC`, sql`${c.id} DESC`)
      .limit(limit + 1),
    db.select({ total: count() }).from(c).where(owned),
  ]);
  return {
    data: {
      data: rows.slice(0, limit),
      total: totals[0].total,
      nextCursor: rows.length > limit ? cursorFor(rows[limit - 1]) : null,
    },
  };
}
export async function createComment(
  id: string,
  viewerId: string,
  content: PostDocument,
  policy: DiscussionPolicy,
  parentId?: string | null,
): Promise<DiscussionResult<DiscussionComment>> {
  const references = await prepareCommentReferences(content);
  return db.transaction(async tx => {
    if (!(await lock(tx, id, policy))) return unavailable;
    const parent = parentId ? await readOne(tx, id, parentId) : undefined;
    if (parentId && (!parent || parent.deletedAt)) return gone;
    if (parent && parent.depth >= 5)
      return { error: 'This thread is too deep. Reply to an earlier comment.', status: 400 };
    const normalized = await canonicalCommentReferences(tx, references);
    if ('error' in normalized) return normalized;
    const [saved] = await tx
      .insert(c)
      .values({
        discussionId: id,
        authorId: viewerId,
        content: normalized.data,
        parentId: parentId ?? null,
        depth: parent ? parent.depth + 1 : 0,
      })
      .returning({ id: c.id });
    const result = (await readOne(tx, id, saved.id))!;
    const recipients = (await policy.notificationRecipients?.(tx, result)) ?? [];
    const events: NewNotification[] = [];
    // Reply notifications take precedence when the resource owner is also the
    // parent author; createNotifications applies preferences before deduplication.
    if (parent?.authorId && parent.authorId !== viewerId)
      recipients.unshift({ recipientUserId: parent.authorId, type: 'comment.reply' });
    for (const recipient of recipients)
      events.push({
        ...recipient,
        actorUserId: viewerId,
        entityType: 'discussion_comment',
        entityId: result.id,
        dedupeKey: `discussion.comment:${result.id}`,
      });
    await createNotifications(tx, events);
    return { data: result };
  });
}
export async function updateComment(
  id: string,
  commentId: string,
  viewerId: string,
  content: PostDocument,
  revision: number,
  policy: DiscussionPolicy,
): Promise<DiscussionResult<DiscussionComment>> {
  const references = await prepareCommentReferences(content);
  return db.transaction(async tx => {
    if (!(await lock(tx, id, policy))) return unavailable;
    const current = await readOne(tx, id, commentId);
    if (!current || current.deletedAt) return gone;
    if (current.authorId !== viewerId)
      return { error: 'You can only edit your own comments.', status: 403 };
    const normalized = await canonicalCommentReferences(tx, references);
    if ('error' in normalized) return normalized;
    const [saved] = await tx
      .update(c)
      .set({ content: normalized.data, revision: sql`${c.revision} + 1`, updatedAt: sql`now()` })
      .where(
        and(
          eq(c.id, commentId),
          eq(c.discussionId, id),
          eq(c.authorId, viewerId),
          isNull(c.deletedAt),
          eq(c.revision, revision),
        ),
      )
      .returning({ id: c.id });
    return saved ? { data: (await readOne(tx, id, saved.id))! } : conflict;
  });
}
export async function deleteComment(
  id: string,
  commentId: string,
  viewerId: string,
  policy: DiscussionPolicy,
): Promise<DiscussionResult<{ id: string }>> {
  return db.transaction(async tx => {
    const resource = await lock(tx, id, policy, commentId);
    if (!resource) return unavailable;
    const current = await readOne(tx, id, commentId);
    if (!current || current.deletedAt) return gone;
    if (current.authorId !== viewerId && !resource.canModerate)
      return {
        error: 'Only the author or a discussion moderator can delete this comment.',
        status: 403,
      };
    const [saved] = await tx
      .update(c)
      .set({
        content: emptyPostDocument(),
        authorId: null,
        deletedAt: sql`now()`,
        updatedAt: sql`now()`,
        revision: sql`${c.revision} + 1`,
      })
      .where(and(eq(c.id, commentId), eq(c.discussionId, id), isNull(c.deletedAt)))
      .returning({ id: c.id });
    if (!saved) return gone;
    const recipients = await tx
      .select({ id: userNotification.recipientUserId })
      .from(userNotification)
      .where(
        and(
          eq(userNotification.entityType, 'discussion_comment'),
          eq(userNotification.entityId, commentId),
        ),
      );
    for (const recipient of new Set(recipients.map(row => row.id))) await notifyUser(tx, recipient);
    return { data: saved };
  });
}

// Resource pages discover their discussion once, then use the same metadata/cache
// and endpoints as any other discussion consumer.
export async function getAttachedDiscussion(
  type: DiscussionType,
  resourceId: string,
  viewerId?: string,
) {
  const id = await getDiscussionAttachment(type)?.findDiscussionId(resourceId);
  return id ? getDiscussionInfo(id, await resolveDiscussionPolicy(id, viewerId)) : unavailable;
}

export async function getOwnCommentsForTarget(
  target: DiscussionTarget,
  viewerId: string,
  cursor: CommentCursor | undefined,
  limit: number,
) {
  const id =
    'discussionId' in target
      ? target.discussionId
      : await getDiscussionAttachment(target.attachmentType)?.findDiscussionId(target.attachmentId);
  // Only the author's rows are returned, never the attachment's private metadata.
  return id
    ? getOwnComments(id, viewerId, cursor, limit)
    : { data: { data: [], total: 0, nextCursor: null } };
}
