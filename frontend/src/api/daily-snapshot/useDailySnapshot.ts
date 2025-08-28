import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { queryClient } from '@/queryClient.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type { DailySnapshotSectionData } from '../../../../types/DailySnapshots.ts';
import { addSectionToDate, getAvailableSectionsWithUpdatedAt, getSectionsFromDate } from '@/dexie';

// Server response shapes
export type DailySnapshotRow = {
  date: string;
  tournamentGroupId: string | null;
  updatedAt: string; // ISO
};

export type DailySnapshotSectionRow = {
  date: string;
  section: string;
  updatedAt: string; // ISO
  data: string; // JSON string of DailySnapshotSectionData<any>
};

export type DailySnapshotGetResponse = {
  data: {
    dailySnapshot: DailySnapshotRow | null;
    sections: DailySnapshotSectionRow[];
  };
};

export type DailySnapshotHookResult = {
  dailySnapshot: DailySnapshotRow | null;
  sections: Record<string, DailySnapshotSectionData<any>>;
  updatedAtMap?: Record<string, string>;
};

function parseSectionRow(row: DailySnapshotSectionRow): {
  section: string;
  payload: DailySnapshotSectionData<any> | null;
  updatedAt: string;
} {
  try {
    const parsed = JSON.parse(row.data) as DailySnapshotSectionData<any>;
    return { section: row.section, payload: parsed, updatedAt: row.updatedAt };
  } catch {
    return { section: row.section, payload: null, updatedAt: row.updatedAt };
  }
}

async function backgroundRefresh(date: string) {
  // Build sections preflight from Dexie (section -> lastUpdatedAt)
  let updatedAtMap = await getAvailableSectionsWithUpdatedAt(date);
  const sectionsParam = Object.entries(updatedAtMap).map(([section, lastUpdatedAt]) => ({
    section,
    lastUpdatedAt,
  }));

  // Call API (if sectionsParam empty, server returns all)
  const res = await api['daily-snapshot'].$get({
    query: {
      date,
      sections: JSON.stringify(sectionsParam),
    },
  });

  if (!res.ok) return; // silent background failure
  const json = (await res.json()) as DailySnapshotGetResponse;

  // Update Dexie for any returned sections (only changed or all if none present before)
  const rows = json.data.sections || [];
  for (const row of rows) {
    const { section, payload, updatedAt } = parseSectionRow(row);
    if (payload) {
      await addSectionToDate(date, section, payload, updatedAt);
    }
  }

  // Merge from Dexie and push into query cache
  const mergedSections = await getSectionsFromDate(date);
  updatedAtMap = await getAvailableSectionsWithUpdatedAt(date);
  const next: DailySnapshotHookResult = {
    dailySnapshot: json.data.dailySnapshot ?? null,
    sections: mergedSections,
    updatedAtMap,
  };

  queryClient.setQueryData(['daily-snapshot', date], next);
}

export function useDailySnapshot(date?: string) {
  const enabled = Boolean(date && date.length > 0);

  return useQuery<DailySnapshotHookResult, ErrorWithStatus>({
    queryKey: ['daily-snapshot', date],
    enabled,
    queryFn: async () => {
      const d = date!;

      // 1) Try to get local sections from Dexie
      const localSections = await getSectionsFromDate(d);
      const hasLocal = Object.keys(localSections).length > 0;

      if (hasLocal) {
        // Kick off background refresh, but return local immediately
        // Don't await; let it update cache when finished
        void backgroundRefresh(d);
        const updatedAtMap = await getAvailableSectionsWithUpdatedAt(d);
        return {
          dailySnapshot: null, // background will populate latest meta; we prioritize speed here
          sections: localSections,
          updatedAtMap,
        };
      }

      // 2) No local data: fetch from server and store
      // When no local sections, we pass empty sections param so server returns all
      const res = await api['daily-snapshot'].$get({
        query: { date: d, sections: JSON.stringify([]) },
      });

      if (!res.ok) {
        const err: ErrorWithStatus = new Error('Failed to load daily snapshot');
        err.status = res.status as any;
        throw err;
      }

      const json = (await res.json()) as DailySnapshotGetResponse;

      // Store sections into Dexie
      for (const row of json.data.sections || []) {
        const { section, payload, updatedAt } = parseSectionRow(row);
        if (payload) {
          await addSectionToDate(d, section, payload, updatedAt);
        }
      }

      const mergedSections = await getSectionsFromDate(d);
      const updatedAtMap = await getAvailableSectionsWithUpdatedAt(d);

      return {
        dailySnapshot: json.data.dailySnapshot ?? null,
        sections: mergedSections,
        updatedAtMap,
      };
    },
    // Reasonable stale time; background refresh already keeps it current when cached
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => (error?.status === 404 ? false : failureCount < 2),
  });
}
