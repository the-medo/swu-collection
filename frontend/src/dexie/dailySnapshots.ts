import { db } from './db';
import type { DailySnapshotSectionData } from '../../../types/DailySnapshots';

// Stored shape for a single date (day)
export interface DailySnapshotDay {
  // Primary key
  date: string; // e.g., '2025-08-19'
  // Sections data keyed by section name
  sections: Record<string, DailySnapshotSectionData<any>>;
  // Fast preflight map with updatedAt for each section (ISO string)
  sectionsUpdatedAt: Record<string, string>;
  // Optional marker for when this record was last modified locally
  fetchedAt?: Date;
}

/**
 * Returns all sections for a given date.
 * If no record exists, returns an empty object.
 */
export async function getSectionsFromDate(
  date: string,
): Promise<Record<string, DailySnapshotSectionData<any>>> {
  const day = await db.dailySnapshots.get(date);
  return day?.sections ?? {};
}

/**
 * Add or update a single section for a given date.
 * - date: day key (YYYY-MM-DD)
 * - section: section name
 * - data: DailySnapshotSectionData payload
 * - updatedAt: server updatedAt (Date | ISO string)
 */
export async function addSectionToDate(
  date: string,
  section: string,
  data: DailySnapshotSectionData<any>,
  updatedAt: Date | string,
): Promise<void> {
  const existing = await db.dailySnapshots.get(date);
  const isoUpdatedAt = typeof updatedAt === 'string' ? updatedAt : updatedAt.toISOString();

  const next: DailySnapshotDay = {
    date,
    sections: {
      ...(existing?.sections ?? {}),
      [section]: data,
    },
    sectionsUpdatedAt: {
      ...(existing?.sectionsUpdatedAt ?? {}),
      [section]: isoUpdatedAt,
    },
    fetchedAt: new Date(),
  };

  await db.dailySnapshots.put(next);
}

/**
 * Returns a map of available sections with their updatedAt ISO timestamps for a given date.
 * Useful for calling the preflight GET /api/daily-snapshot with client's lastUpdatedAt values.
 */
export async function getAvailableSectionsWithUpdatedAt(
  date: string,
): Promise<Record<string, string>> {
  const day = await db.dailySnapshots.get(date);
  return day?.sectionsUpdatedAt ?? {};
}

/**
 * Returns a single section's data if available.
 */
export async function getSectionData(
  date: string,
  section: string,
): Promise<DailySnapshotSectionData<any> | undefined> {
  const day = await db.dailySnapshots.get(date);
  return day?.sections?.[section];
}
