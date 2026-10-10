import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { db } from '../../db';
import { userNotification as n } from '../../db/schema/user_notification.ts';
import { userSettings } from '../../db/schema/user_settings.ts';
import type { NotificationType } from '../../../shared/types/notifications.ts';
import type { NotificationSettingsValues } from '../../../shared/lib/userSettings.ts';
import { canReceiveNotifications } from './policy.ts';
import { notifyUser } from './publish.ts';

export type NotificationTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type NewNotification = Pick<
  typeof n.$inferInsert,
  'recipientUserId' | 'actorUserId' | 'type' | 'entityType' | 'entityId' | 'dedupeKey'
>;

const preferenceKeys: Record<NotificationType, keyof NotificationSettingsValues | null> = {
  'crossfire.invitation': null,
  'deck.favorite': 'notifications_deck_favorites',
  'deck.comment': 'notifications_deck_comments',
  'comment.reply': 'notifications_comment_replies',
  'team.member.joined': 'notifications_team_members',
};

/** Create rows and publish only on commit; preferences and recipient policy apply to every caller. */
export async function createNotifications(tx: NotificationTransaction, events: NewNotification[]) {
  const candidates = events.filter(event => canReceiveNotifications(event.recipientUserId));
  if (!candidates.length) return;
  const settings = await tx
    .select()
    .from(userSettings)
    .where(
      and(
        inArray(userSettings.userId, [...new Set(candidates.map(event => event.recipientUserId))]),
        inArray(
          userSettings.key,
          Object.values(preferenceKeys).filter(key => key !== null),
        ),
      ),
    );
  const disabled = new Set(
    settings
      .filter(setting => setting.value === 'false')
      .map(setting => JSON.stringify([setting.userId, setting.key])),
  );
  const enabled = candidates.filter(
    event => !disabled.has(JSON.stringify([event.recipientUserId, preferenceKeys[event.type]])),
  );
  if (!enabled.length) return;
  const rows = await tx
    .insert(n)
    .values(enabled)
    .onConflictDoNothing()
    .returning({ userId: n.recipientUserId });
  for (const userId of new Set(rows.map(row => row.userId))) await notifyUser(tx, userId);
}

/** Serialize a source's forward/reverse actions, including when its row does not exist yet. */
export async function lockNotificationSource(tx: NotificationTransaction, source: string[]) {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${JSON.stringify(['notification-source', ...source])}, 0))`,
  );
}

/** Retract only untouched entries. Call inside the transaction that reverses the source action. */
export async function retractUnseenNotifications(
  tx: NotificationTransaction,
  source: { type: NotificationType; entityType: string; entityId: string; actorUserId: string },
) {
  const rows = await tx
    .delete(n)
    .where(
      and(
        eq(n.type, source.type),
        eq(n.entityType, source.entityType),
        eq(n.entityId, source.entityId),
        eq(n.actorUserId, source.actorUserId),
        isNull(n.firstReadAt),
        isNull(n.readAt),
        isNull(n.archivedAt),
      ),
    )
    .returning({ userId: n.recipientUserId });
  for (const userId of new Set(rows.map(row => row.userId))) await notifyUser(tx, userId);
}
