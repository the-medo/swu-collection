import { api } from '@/lib/api.ts';
import { saveUserSettings } from '../dexie/userSettings';
import type { UserSettings } from '../../../shared/lib/userSettings';

/**
 * Fetches user settings from the API and saves them to IndexedDB
 * @returns Promise that resolves with the fetched user settings
 */
export async function fetchAndSaveUserSettings(): Promise<UserSettings> {
  try {
    // Fetch user settings from the API
    const response = await api['user-settings'].$get();

    if (!response.ok) {
      throw new Error(`Failed to fetch user settings: ${response.status} ${response.statusText}`);
    }

    // Parse the response
    const userSettings = await response.json();

    // Save the settings to IndexedDB
    await saveUserSettings(userSettings);

    return userSettings;
  } catch (error) {
    console.error('Error fetching and saving user settings:', error);
    throw error;
  }
}
