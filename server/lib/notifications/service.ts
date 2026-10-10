import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { userNotification as n } from '../../db/schema/user_notification.ts';
import type {
  NotificationCursor,
  NotificationItem,
  NotificationPage,
} from '../../../shared/types/notifications.ts';
import { notifyUser } from './publish.ts';
import { canReceiveNotifications } from './policy.ts';
import { deckReadAccess } from '../decks/deckFolderAccess.ts';
import { deck } from '../../db/schema/deck.ts';
import { deckDiscussion } from '../../db/schema/deck_discussion.ts';
import { discussionComment } from '../../db/schema/discussion.ts';

// Only UUID-backed targets exist today. Guard the cast so future target kinds
// cannot break reads of older notifications.
const targetUuid = sql`CASE WHEN ${n.entityId} ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' THEN ${n.entityId}::uuid END`;
const deckTarget = sql`EXISTS (SELECT 1 FROM deck d WHERE d.id = ${targetUuid} AND d.user_id = ${n.recipientUserId})`;
const teamTarget = sql`EXISTS (SELECT 1 FROM team_member m WHERE m.team_id = ${targetUuid} AND m.user_id = ${n.recipientUserId})`;
const commentTarget = sql`EXISTS (SELECT 1 FROM ${discussionComment}
  JOIN ${deckDiscussion} ON ${deckDiscussion.discussionId} = ${discussionComment.discussionId}
  JOIN ${deck} ON ${deck.id} = ${deckDiscussion.deckId}
  WHERE ${discussionComment.id} = ${targetUuid} AND ${discussionComment.deletedAt} IS NULL
    AND ${deckReadAccess(sql`${n.recipientUserId}`)})`;
const invitationTarget = sql`EXISTS (SELECT 1 FROM play.invitations i JOIN play.lobbies l ON l.id = i.lobby_id
  WHERE i.lobby_id = ${n.entityId} AND i.recipient_user_id = ${n.recipientUserId})`;
const visible = (userId: string, crossfire: boolean) =>
  and(
    eq(n.recipientUserId, userId),
    sql`${canReceiveNotifications(userId)}`,
    isNull(n.archivedAt),
    sql`((${n.type} = 'deck.favorite' AND ${n.entityType} = 'deck' AND ${deckTarget})
    OR (${crossfire} AND ${n.type} = 'crossfire.invitation' AND ${n.entityType} = 'crossfire_lobby' AND ${invitationTarget})
    OR (${n.type} = 'team.member.joined' AND ${n.entityType} = 'team' AND ${teamTarget})
    OR (${n.type} IN ('deck.comment', 'comment.reply') AND ${n.entityType} = 'discussion_comment' AND ${commentTarget}))`,
  );

export const notifications = {
  async unreadCount(userId: string, crossfire: boolean) {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(n)
      .where(and(visible(userId, crossfire), isNull(n.readAt)));
    return row?.count ?? 0;
  },
  async list(
    userId: string,
    crossfire: boolean,
    cursor?: NotificationCursor,
    options: { unreadOnly?: boolean; limit?: number } = {},
  ): Promise<NotificationPage> {
    const limit = options.limit ?? 30;
    const rows = await db
      .select({
        id: n.id,
        type: n.type,
        entityId: n.entityId,
        targetDeckId: sql<
          string | null
        >`CASE WHEN ${n.type} IN ('deck.comment', 'comment.reply') THEN
          (SELECT ${deckDiscussion.deckId}::text FROM ${discussionComment} JOIN ${deckDiscussion} ON ${deckDiscussion.discussionId} = ${discussionComment.discussionId} WHERE ${discussionComment.id} = ${targetUuid}) END`,
        actorUserId: user.id,
        actorName: user.displayName,
        entityName: sql<
          string | null
        >`CASE WHEN ${n.type} = 'deck.favorite' THEN (SELECT d.name FROM deck d WHERE d.id = ${targetUuid})
          WHEN ${n.type} = 'team.member.joined' THEN (SELECT t.name FROM team t WHERE t.id = ${targetUuid})
          WHEN ${n.type} IN ('deck.comment', 'comment.reply') THEN (SELECT ${deck.name} FROM ${discussionComment}
            JOIN ${deckDiscussion} ON ${deckDiscussion.discussionId} = ${discussionComment.discussionId}
            JOIN ${deck} ON ${deck.id} = ${deckDiscussion.deckId} WHERE ${discussionComment.id} = ${targetUuid}) END`,
        createdAt: sql<string>`to_char(${n.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
        readAt: n.readAt,
        archivedAt: n.archivedAt,
        available: sql<boolean>`CASE WHEN ${n.type} = 'crossfire.invitation' THEN EXISTS (
        SELECT 1 FROM play.lobbies l WHERE l.id = ${n.entityId} AND l.status = 'waiting' AND l.expires_at > clock_timestamp()
      ) ELSE true END`,
        expiresAt: sql<
          string | null
        >`CASE WHEN ${n.type} = 'crossfire.invitation' THEN (SELECT l.expires_at::text FROM play.lobbies l WHERE l.id = ${n.entityId}) END`,
      })
      .from(n)
      .leftJoin(user, eq(n.actorUserId, user.id))
      .where(
        and(
          visible(userId, crossfire),
          options.unreadOnly ? isNull(n.readAt) : undefined,
          cursor
            ? sql`(${n.createdAt}, ${n.id}) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`
            : undefined,
        ),
      )
      .orderBy(sql`${n.createdAt} DESC NULLS LAST`, sql`${n.id} DESC NULLS LAST`)
      .limit(limit + 1);
    const items: NotificationItem[] = rows.slice(0, limit).map(row => ({
      ...row,
      actorName: row.actorName?.trim() || null,
      createdAt: row.createdAt,
      readAt: row.readAt ? new Date(row.readAt).toISOString() : null,
      archivedAt: row.archivedAt ? new Date(row.archivedAt).toISOString() : null,
      expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString() : null,
    }));
    const last = items[items.length - 1];
    return {
      items,
      nextCursor: rows.length > limit && last ? { createdAt: last.createdAt, id: last.id } : null,
    };
  },
  async update(userId: string, id: string, action: 'read' | 'unread' | 'archive') {
    return db.transaction(async tx => {
      const rows = await tx
        .update(n)
        .set(
          action === 'archive'
            ? { archivedAt: sql`clock_timestamp()` }
            : action === 'read'
              ? {
                  readAt: sql`coalesce(${n.readAt}, clock_timestamp())`,
                  firstReadAt: sql`coalesce(${n.firstReadAt}, ${n.readAt}, clock_timestamp())`,
                }
              : { readAt: null, firstReadAt: sql`coalesce(${n.firstReadAt}, ${n.readAt})` },
        )
        .where(and(eq(n.id, id), eq(n.recipientUserId, userId)))
        .returning({ id: n.id });
      if (rows.length) await notifyUser(tx, userId);
      return rows.length > 0;
    });
  },
  async readAll(userId: string, crossfire: boolean) {
    await db.transaction(async tx => {
      const rows = await tx
        .update(n)
        .set({
          readAt: sql`clock_timestamp()`,
          firstReadAt: sql`coalesce(${n.firstReadAt}, clock_timestamp())`,
        })
        .where(and(visible(userId, crossfire), isNull(n.readAt)))
        .returning({ id: n.id });
      if (rows.length) await notifyUser(tx, userId);
    });
  },
};
