import { db } from './db';
import {
  userSettingsSchema,
  type UserSettings,
  getDefaultSettingValue,
} from '../../../shared/lib/userSettings';
import { z } from 'zod';

// Interface for the UserSettings store in Dexie
export interface UserSettingsStore {
  key: string;
  value: string;
}

/**
 * Returns true if the key is a valid property name of the user settings schema.
 */
export function isValidSettingKey(key: string): key is keyof UserSettings {
  return Object.prototype.hasOwnProperty.call(userSettingsSchema.shape, key);
}

/**
 * Checks if the value is valid for a certain key in the user settings schema.
 * @param key - The key of the setting
 * @param value - The value to validate
 * @returns true if valid, false if invalid
 */
export function validateSettingValue<K extends keyof UserSettings>(
  key: K,
  value: unknown,
): value is UserSettings[K] {
  // Extract the property schema for the key
  const propertySchema = userSettingsSchema.shape[key];

  // Handle boolean values stored as text
  if (
    (propertySchema instanceof z.ZodBoolean ||
      (propertySchema instanceof z.ZodDefault &&
        propertySchema._def.innerType._def.typeName === 'ZodBoolean')) &&
    typeof value === 'string'
  ) {
    if (value === 'true') {
      return propertySchema.safeParse(true).success;
    } else if (value === 'false') {
      return propertySchema.safeParse(false).success;
    }
  }

  // Use safeParse for a non-throwing result
  return propertySchema.safeParse(value).success;
}

/**
 * Saves the entire UserSettings object to Dexie
 * @param settings The UserSettings object to save
 * @returns Promise that resolves when all settings are saved
 */
export async function saveUserSettings(settings: UserSettings): Promise<void> {
  // Validate the settings object using the Zod schema
  const validatedSettings = userSettingsSchema.parse(settings);

  // Convert the settings object to key-value pairs and save each one
  const promises = Object.entries(validatedSettings).map(([key, value]) => {
    return saveUserSetting(key, String(value));
  });

  await Promise.all(promises);
}

/**
 * Saves a single key-value pair to Dexie
 * @param key The setting key
 * @param value The setting value
 * @returns Promise that resolves when the setting is saved
 * @throws Error if the key is not valid or the value is not valid for the key
 */
export async function saveUserSetting(key: string, value: string): Promise<void> {
  // Check if the key is valid
  if (!isValidSettingKey(key)) {
    throw new Error(`Invalid setting key: ${key}`);
  }

  try {
    // Validate the value for this specific key
    validateSettingValue(key, value);

    // Save to Dexie
    await db.userSettings.put({
      key,
      value,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid value for setting ${key}: ${value}`);
    }
    throw error;
  }
}

/**
 * Loads a single setting from Dexie
 * @param key The setting key to load
 * @returns Promise that resolves with the setting value (default value if not found or invalid)
 * @throws Error if the key is not valid
 */
export async function loadUserSetting(key: string): Promise<string> {
  // Check if the key is valid
  if (!isValidSettingKey(key)) {
    throw new Error(`Invalid setting key: ${key}`);
  }

  // Load from Dexie
  const setting = await db.userSettings.get(key);

  if (!setting) {
    // Get default value for this key
    const defaultValue = getDefaultSettingValue(key);
    // Convert to string (as our DB stores strings)
    const defaultValueStr = String(defaultValue);

    // Save the default value to the database
    await saveUserSetting(key, defaultValueStr);

    return defaultValueStr;
  }

  // Validate the value for this specific key
  if (validateSettingValue(key, setting.value)) {
    return setting.value;
  } else {
    // Value is invalid, use default value instead
    console.warn(
      `Invalid stored value for setting ${key}: ${setting.value}, using default instead`,
    );
    const defaultValue = getDefaultSettingValue(key);
    const defaultValueStr = String(defaultValue);

    // Save the default value to the database
    await saveUserSetting(key, defaultValueStr);

    return defaultValueStr;
  }
}

/**
 * Loads all user settings from Dexie
 * @returns Promise that resolves with a complete UserSettings object
 * @description If any setting has an invalid value, it will be replaced with its default value
 */
export async function loadAllUserSettings(): Promise<UserSettings> {
  const validatedSettings: Record<string, unknown> = {};

  // Get all settings from Dexie
  const allSettings = await db.userSettings.toArray();

  // Create a map of existing settings for quick lookup
  const existingSettingsMap = new Map<string, string>();
  for (const setting of allSettings) {
    if (isValidSettingKey(setting.key)) {
      existingSettingsMap.set(setting.key, setting.value);
    }
  }

  // Get all valid setting keys from the schema
  const allSettingKeys = Object.keys(userSettingsSchema.shape) as Array<keyof UserSettings>;

  // Process all settings (existing and missing)
  for (const key of allSettingKeys) {
    if (existingSettingsMap.has(key)) {
      // Setting exists, validate it
      const value = existingSettingsMap.get(key)!;
      // Validate the value for this specific key
      if (validateSettingValue(key, value)) {
        validatedSettings[key] = value;
      } else {
        // Value is invalid, use default value instead
        console.warn(`Invalid stored value for setting ${key}: ${value}, using default instead`);
        const defaultValue = getDefaultSettingValue(key);
        validatedSettings[key] = defaultValue;

        // Save the default value to the database (don't await to avoid blocking)
        saveUserSetting(key, String(defaultValue)).catch(error => {
          console.error(`Failed to save default value for setting ${key}:`, error);
        });
      }
    } else {
      // Setting is missing, use default value and save it
      const defaultValue = getDefaultSettingValue(key);
      validatedSettings[key] = defaultValue;

      // Save the default value to the database (don't await to avoid blocking)
      saveUserSetting(key, String(defaultValue)).catch(error => {
        console.error(`Failed to save default value for setting ${key}:`, error);
      });
    }
  }

  // Parse the settings to ensure all values are valid and defaults are applied
  return userSettingsSchema.parse(validatedSettings) as UserSettings;
}
