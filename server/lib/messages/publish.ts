import { sql, type SQL } from 'drizzle-orm';
import type { MessageChange } from '../../../shared/types/messages.ts';
import { userNotificationChannel } from '../../../shared/types/notifications.ts';

export async function notifyMessageChanged(
  tx: { execute(query: SQL): Promise<unknown> },
  userId: string,
  change: MessageChange,
) {
  await tx.execute(
    sql`SELECT pg_notify(${userNotificationChannel}, ${JSON.stringify({ userId, type: 'messages.changed', change })})`,
  );
}
