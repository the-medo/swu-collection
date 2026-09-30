import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { userSettings } from '../db/schema/user_settings.ts';
import {
  homeLocationSchema,
  homeLocationSettingKey,
  parseHomeLocation,
  type HomeLocationInput,
} from '../../shared/lib/userHomeLocation.ts';
import { geocodeTournament } from './tournaments/geocoding.ts';

const owned = (userId: string) =>
  and(eq(userSettings.userId, userId), eq(userSettings.key, homeLocationSettingKey));

export const userHomeLocationService = {
  async get(userId: string) {
    const [row] = await db
      .select({ value: userSettings.value })
      .from(userSettings)
      .where(owned(userId));
    return parseHomeLocation(row?.value);
  },
  async save(userId: string, input: HomeLocationInput | null, geocoder = geocodeTournament) {
    return db.transaction(async tx => {
      // Serialize saves/removal for this account, including the provider request.
      // An in-flight geocode cannot restore an address that was subsequently removed.
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${userId}), hashtext(${homeLocationSettingKey}))`,
      );
      if (!input) {
        await tx.delete(userSettings).where(owned(userId));
        return null;
      }
      const result = await geocoder(input, input.country);
      const value = homeLocationSchema.parse({
        input,
        coordinates: result.coordinates,
        formattedAddress: result.additionalInfo.geocoding?.formattedAddress,
        precision: result.additionalInfo.locationPrecision,
        updatedAt: new Date().toISOString(),
      });
      await tx
        .insert(userSettings)
        .values({ userId, key: homeLocationSettingKey, value: JSON.stringify(value) })
        .onConflictDoUpdate({
          target: [userSettings.userId, userSettings.key],
          set: { value: JSON.stringify(value) },
        });
      return value;
    });
  },
};
