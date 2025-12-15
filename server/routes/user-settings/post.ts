import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db';
import { userSettings } from '../../db/schema/user_settings.ts';
import { userSettingsSchema } from '../../../shared/lib/userSettings.ts';
import { and, eq } from 'drizzle-orm';

// Schema for POST request validation
const settingUpdateSchema = userSettingsSchema.partial();

export const userSettingsPostRoute = new Hono<AuthExtension>().post('/', async c => {
  const user = c.get('user');

  // User must be logged in
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Validate request body
  const body = await c.req.json();
  const result = settingUpdateSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: 'Invalid request body', details: result.error.format() }, 400);
  }

  const settings = result.data;

  // Process each setting in the partial object
  for (const [key, value] of Object.entries(settings)) {
    if (value === null) {
      await db
        .delete(userSettings)
        .where(and(eq(userSettings.userId, user.id), eq(userSettings.key, key)));
      continue;
    }

    // Convert value to string for storage
    const stringValue = String(value);

    // Upsert the setting
    await db
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

  return c.json({ success: true });
});
