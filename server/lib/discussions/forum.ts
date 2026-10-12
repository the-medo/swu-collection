import { and, eq, or, sql } from 'drizzle-orm';
import { db } from '../../db';
import { discussion, discussionComment } from '../../db/schema/discussion.ts';
import { forumThread } from '../../db/schema/forum_thread.ts';
import type { ForumThread } from '../../../shared/types/discussions.ts';
import type { PostDocument } from '../../../shared/posts/content.ts';
import type { DiscussionResult } from './policy.ts';
import { canonicalCommentReferences, prepareCommentReferences } from './references.ts';
import { forumModerator } from './forumAttachment.ts';
import { assertPostAllowed, assertTextAllowed } from '../moderation/content.ts';

const missing = { error: 'This discussion is unavailable.', status: 404 as const };
const canManage = (viewerId?: string) =>
  sql<boolean>`coalesce(${or(
    viewerId ? eq(forumThread.authorId, viewerId) : undefined,
    forumModerator(viewerId),
  )}, false)`;

export async function getForumThread(
  id: string,
  viewerId?: string,
): Promise<DiscussionResult<ForumThread>> {
  const [row] = await db
    .select({
      id: forumThread.discussionId,
      title: forumThread.title,
      openingCommentId: forumThread.openingCommentId,
      canManage: canManage(viewerId),
    })
    .from(forumThread)
    .innerJoin(discussion, eq(discussion.id, forumThread.discussionId))
    .where(and(eq(forumThread.discussionId, id), eq(discussion.type, 'forum')));
  return row ? { data: row } : missing;
}

export async function createForumThread(
  viewerId: string,
  title: string,
  content: PostDocument,
): Promise<DiscussionResult<ForumThread>> {
  assertTextAllowed(title, 'title', 'Discussion title');
  assertPostAllowed(content, 'Opening post');
  const references = await prepareCommentReferences(content);
  return db.transaction(async tx => {
    const normalized = await canonicalCommentReferences(tx, references);
    if ('error' in normalized) return normalized;
    assertPostAllowed(normalized.data, 'Opening post');
    const [created] = await tx.insert(discussion).values({ type: 'forum' }).returning();
    const [opening] = await tx
      .insert(discussionComment)
      .values({ discussionId: created.id, authorId: viewerId, content: normalized.data })
      .returning();
    await tx
      .insert(forumThread)
      .values({
        discussionId: created.id,
        title,
        authorId: viewerId,
        openingCommentId: opening.id,
      });
    return { data: { id: created.id, title, openingCommentId: opening.id, canManage: true } };
  });
}

export async function manageForumThread(
  id: string,
  viewerId: string,
  title?: string,
): Promise<DiscussionResult<{ id: string }>> {
  return db.transaction(async tx => {
    // Match the shared comment service's resource-then-discussion lock order.
    const [thread] = await tx
      .select({ allowed: canManage(viewerId) })
      .from(forumThread)
      .where(eq(forumThread.discussionId, id))
      .for('update');
    if (!thread) return missing;
    if (!thread.allowed)
      return { error: 'Only the author or a moderator can manage this discussion.', status: 403 };
    if (title !== undefined) assertTextAllowed(title, 'title', 'Discussion title');
    await tx
      .select({ id: discussion.id })
      .from(discussion)
      .where(eq(discussion.id, id))
      .for('update');
    if (title !== undefined)
      await tx.update(forumThread).set({ title }).where(eq(forumThread.discussionId, id));
    else await tx.delete(discussion).where(eq(discussion.id, id));
    return { data: { id } };
  });
}
