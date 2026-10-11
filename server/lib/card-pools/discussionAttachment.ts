import { z } from 'zod';
import { and, eq, isNotNull, isNull, or, sql } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { cardPools } from '../../db/schema/card_pool.ts';
import { dailyPoolDiscussion } from '../../db/schema/daily_pool_discussion.ts';
import { discussion, discussionComment } from '../../db/schema/discussion.ts';
import type { DiscussionAttachment } from '../discussions/attachments.ts';
import type { DiscussionPolicy } from '../discussions/policy.ts';
import { DAILY_SEALED_USER_ID } from './daily-sealed.ts';

// These are public homepage discussions, never discussions for ordinary or hidden pools.
const publicDailyPool = and(
  eq(cardPools.userId, DAILY_SEALED_USER_ID),
  isNotNull(cardPools.dailyDate),
  eq(cardPools.visibility, 'public'),
  eq(cardPools.status, 'ready'),
  isNull(cardPools.archivedAt),
)!;

function readableDailyPoolDiscussion() {
  return sql`EXISTS (SELECT 1 FROM ${dailyPoolDiscussion}
    JOIN ${cardPools} ON ${cardPools.id} = ${dailyPoolDiscussion.cardPoolId}
    WHERE ${dailyPoolDiscussion.discussionId} = ${discussion.id} AND ${publicDailyPool})`;
}

function dailyPoolModerator(viewerId?: string) {
  if (!viewerId) return sql<boolean>`false`;
  if (viewerId === DAILY_SEALED_USER_ID) return sql<boolean>`true`;
  return sql<boolean>`EXISTS (SELECT 1 FROM ${user} WHERE ${user.id} = ${viewerId}
    AND 'admin' = ANY(regexp_split_to_array(btrim(coalesce(${user.role}, '')), '[[:space:]]*,[[:space:]]*')))`;
}

function dailyPoolDiscussionPolicy(viewerId?: string): DiscussionPolicy {
  const moderator = dailyPoolModerator(viewerId);
  return {
    readable: readableDailyPoolDiscussion(),
    moderator,
    async lockResource(tx, discussionId, ownCommentId) {
      const [resource] = await tx
        .select({ canModerate: moderator })
        .from(cardPools)
        .innerJoin(dailyPoolDiscussion, eq(dailyPoolDiscussion.cardPoolId, cardPools.id))
        .where(
          and(
            eq(dailyPoolDiscussion.discussionId, discussionId),
            or(
              publicDailyPool,
              // Authors may still erase their own prose after the pool becomes unavailable.
              viewerId && ownCommentId
                ? sql`EXISTS (SELECT 1 FROM ${discussionComment}
                  WHERE ${discussionComment.discussionId} = ${discussionId}
                    AND ${discussionComment.id} = ${ownCommentId}
                    AND ${discussionComment.authorId} = ${viewerId})`
                : undefined,
            ),
          ),
        )
        .for('update', { of: cardPools });
      return resource;
    },
    // Replies use the shared discussion notifications; no broadcast to the system account.
  };
}

export const dailyPoolDiscussionAttachment: DiscussionAttachment = {
  async findDiscussionId(resourceId) {
    if (!z.guid().safeParse(resourceId).success) return undefined;
    const [row] = await db
      .select({ id: dailyPoolDiscussion.discussionId })
      .from(dailyPoolDiscussion)
      .innerJoin(discussion, eq(discussion.id, dailyPoolDiscussion.discussionId))
      .where(
        and(eq(dailyPoolDiscussion.cardPoolId, resourceId), eq(discussion.type, 'daily-pool')),
      );
    return row?.id;
  },
  readable: readableDailyPoolDiscussion,
  policy: dailyPoolDiscussionPolicy,
  notificationTarget: {
    name: sql`(SELECT ${cardPools.name} FROM ${dailyPoolDiscussion}
      JOIN ${cardPools} ON ${cardPools.id} = ${dailyPoolDiscussion.cardPoolId}
      WHERE ${dailyPoolDiscussion.discussionId} = ${discussion.id})`,
    url: commentId => sql`(SELECT '/?homeMode=today&poolDate=' || ${cardPools.dailyDate}::text
      || '&poolDiscussion=true&poolComment=' || ${commentId}::text
      FROM ${dailyPoolDiscussion} JOIN ${cardPools} ON ${cardPools.id} = ${dailyPoolDiscussion.cardPoolId}
      WHERE ${dailyPoolDiscussion.discussionId} = ${discussion.id})`,
  },
};
