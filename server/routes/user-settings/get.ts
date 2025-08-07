import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db';
import { userSettings } from '../../db/schema/user_settings.ts';
import { eq } from 'drizzle-orm';
import { userSettingsSchema } from '../../../shared/lib/userSettings.ts';

export const userSettingsGetRoute = new Hono<AuthExtension>().get(
  '/',
  async (c) => {
    const user = c.get('user');
    
    // User must be logged in
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // Get default settings from schema
    const defaultSettings = userSettingsSchema.parse({});
    
    // Get user settings from database
    const userSettingsFromDb = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, user.id));
    
    // Merge default settings with user settings from database
    const mergedSettings = { ...defaultSettings };
    
    // Override defaults with values from database
    for (const setting of userSettingsFromDb) {
      // Cast the value to the appropriate type based on the default value type
      const key = setting.key as keyof typeof defaultSettings;
      if (key in defaultSettings) {
        const defaultValue = defaultSettings[key];
        
        if (typeof defaultValue === 'boolean') {
          mergedSettings[key] = setting.value === 'true';
        } else if (typeof defaultValue === 'number') {
          mergedSettings[key] = Number(setting.value);
        } else {
          mergedSettings[key] = setting.value;
        }
      }
    }
    
    return c.json(mergedSettings);
  }
);