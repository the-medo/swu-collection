import { sql, type SQL } from 'drizzle-orm';
import type { TransactionSql } from 'postgres';
import { userNotificationChannel } from '../../../shared/types/notifications.ts';
import { canReceiveNotifications } from './policy.ts';

export async function notifyUser(
  tx: { execute(query: SQL): Promise<unknown> },
  userId: string,
  type: 'notifications.changed' | 'user.settings.changed' = 'notifications.changed',
) {
  if (type === 'notifications.changed' && !canReceiveNotifications(userId)) return;
  await tx.execute(
    sql`SELECT pg_notify(${userNotificationChannel}, ${JSON.stringify({ userId, type })})`,
  );
}

/** Called inside the lobby's transaction; mandatory invitations never consult preferences. */
export async function createInvitationNotification(
  tx: TransactionSql,
  recipientId: string,
  actorId: string,
  lobbyId: string,
) {
  if (!canReceiveNotifications(recipientId)) return;
  const rows = await tx`INSERT INTO public.user_notification
    (recipient_user_id, actor_user_id, type, entity_type, entity_id, dedupe_key)
    VALUES (${recipientId}, ${actorId}, 'crossfire.invitation', 'crossfire_lobby', ${lobbyId}, ${`crossfire.invitation:${lobbyId}`})
    ON CONFLICT (recipient_user_id, dedupe_key) DO NOTHING RETURNING id`;
  if (rows.length)
    await tx`SELECT pg_notify(${userNotificationChannel}, ${JSON.stringify({ userId: recipientId, type: 'notifications.changed' })})`;
}
