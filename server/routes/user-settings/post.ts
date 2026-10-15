import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db';
import { userSettings } from '../../db/schema/user_settings.ts';
import { userSettingsUpdateSchema } from '../../../shared/lib/userSettings.ts';
import { and, eq } from 'drizzle-orm';
import { notifyUser } from '../../lib/notifications/publish.ts';
import {
  DeckFolderNotFoundError,
  requireDeckFolderForCreation,
} from '../../lib/decks/deckFolders.ts';
import { user as userTable } from '../../db/schema/auth-schema.ts';

export const userSettingsPostRoute = new Hono<AuthExtension>().post('/', async c => {
  const user = c.get('user');

  // User must be logged in
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Validate request body
  const body = await c.req.json();
  const result = userSettingsUpdateSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: 'Invalid request body', details: result.error.format() }, 400);
  }

  const settings = result.data;

  try {
    await db.transaction(async tx => {
      if (Object.prototype.hasOwnProperty.call(settings, 'defaultLimitedFolderId')) {
        await tx
          .select({ id: userTable.id })
          .from(userTable)
          .where(eq(userTable.id, user.id))
          .for('update');
        await requireDeckFolderForCreation(
          tx,
          user.id,
          settings.defaultLimitedFolderId as string | null,
        );
      }
      // Process only settings explicitly supplied in this patch.
      for (const [key, value] of Object.entries(settings)) {
        if (value === null) {
          await tx
            .delete(userSettings)
            .where(and(eq(userSettings.userId, user.id), eq(userSettings.key, key)));
          continue;
        }

        const stringValue = String(value);

        await tx
          .insert(userSettings)
          .values({
            userId: user.id,
            key,
            value: stringValue,
          })
          .onConflictDoUpdate({
            target: [userSettings.userId, userSettings.key],
            set: { value: stringValue },
          });
      }
      if (
        Object.prototype.hasOwnProperty.call(settings, 'notifications_deck_favorites') ||
        Object.prototype.hasOwnProperty.call(settings, 'notifications_deck_comments') ||
        Object.prototype.hasOwnProperty.call(settings, 'notifications_comment_replies') ||
        Object.prototype.hasOwnProperty.call(settings, 'notifications_team_members')
      )
        await notifyUser(tx, user.id, 'user.settings.changed');
    });
  } catch (error) {
    if (error instanceof DeckFolderNotFoundError) return c.json({ error: error.message }, 404);
    throw error;
  }

  return c.json({ success: true });
});
