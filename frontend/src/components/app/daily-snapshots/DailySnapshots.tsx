import * as React from 'react';
import { Helmet } from 'react-helmet-async';
import { useDailySnapshot } from '@/api/daily-snapshot/useDailySnapshot.ts';
import {
  MetaShareTwoWeeks,
  ForceVsNonforce,
  UpcomingTournaments,
  WeeklyChange,
  RecentTournaments,
  MostPlayedCards,
} from './sections';
import { cn } from '@/lib/utils.ts';
import GridSection, { SectionCardSizing } from '@/components/app/daily-snapshots/GridSection.tsx';

const formatToday = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const orderedKeys = [
  'meta-share-2-weeks',
  'force-vs-nonforce',
  'upcoming-tournaments',
  'weekly-change',
  'recent-tournaments',
  'most-played-cards',
] as const;

type OrderedKey = (typeof orderedKeys)[number];

const componentByKey: Record<OrderedKey, React.FC<{ payload: any }>> = {
  'meta-share-2-weeks': MetaShareTwoWeeks,
  'force-vs-nonforce': ForceVsNonforce,
  'upcoming-tournaments': UpcomingTournaments,
  'weekly-change': WeeklyChange,
  'recent-tournaments': RecentTournaments,
  'most-played-cards': MostPlayedCards,
};

const sizingByKey: Record<OrderedKey, SectionCardSizing> = {
  'meta-share-2-weeks': {
    4: { row: { from: 1, to: 1 }, col: { from: 1, to: 3 } },
    3: { row: { from: 1, to: 1 }, col: { from: 1, to: 2 } },
    2: { row: { from: 1, to: 1 }, col: { from: 1, to: 2 } },
    1: { row: { from: 1, to: 1 }, col: { from: 1, to: 1 } },
  },
  'force-vs-nonforce': {
    4: { row: { from: 2, to: 2 }, col: { from: 3, to: 3 } },
    3: { row: { from: 1, to: 1 }, col: { from: 3, to: 3 } },
    2: { row: { from: 2, to: 2 }, col: { from: 2, to: 2 } },
    1: { row: { from: 3, to: 3 }, col: { from: 1, to: 1 } },
  },
  'upcoming-tournaments': {
    4: { row: { from: 3, to: 4 }, col: { from: 4, to: 4 } },
    3: { row: { from: 2, to: 2 }, col: { from: 3, to: 3 } },
    2: { row: { from: 3, to: 3 }, col: { from: 2, to: 2 } },
    1: { row: { from: 5, to: 5 }, col: { from: 1, to: 1 } },
  },
  'weekly-change': {
    4: { row: { from: 2, to: 2 }, col: { from: 1, to: 2 } },
    3: { row: { from: 2, to: 2 }, col: { from: 1, to: 2 } },
    2: { row: { from: 2, to: 2 }, col: { from: 1, to: 1 } },
    1: { row: { from: 2, to: 2 }, col: { from: 1, to: 1 } },
  },
  'recent-tournaments': {
    4: { row: { from: 1, to: 2 }, col: { from: 4, to: 4 } },
    3: { row: { from: 3, to: 3 }, col: { from: 3, to: 3 } },
    2: { row: { from: 3, to: 3 }, col: { from: 1, to: 1 } },
    1: { row: { from: 4, to: 4 }, col: { from: 1, to: 1 } },
  },
  'most-played-cards': {
    4: { row: { from: 3, to: 3 }, col: { from: 1, to: 3 } },
    3: { row: { from: 3, to: 3 }, col: { from: 1, to: 2 } },
    2: { row: { from: 4, to: 4 }, col: { from: 1, to: 2 } },
    1: { row: { from: 6, to: 6 }, col: { from: 1, to: 1 } },
  },
};

const DailySnapshots: React.FC = () => {
  const today = React.useMemo(() => formatToday(), []);
  const { data, isLoading, isError, error } = useDailySnapshot(today);

  const sections = data?.sections ?? {};

  // ensure we render in the desired order first, then any other sections returned by API
  const knownEntries = orderedKeys
    .filter(key => sections[key])
    .map(key => [key, sections[key]] as const);
  const otherEntries = Object.entries(sections).filter(
    ([key]) => !orderedKeys.includes(key as OrderedKey),
  );
  const sectionEntries = [...knownEntries, ...otherEntries];

  return (
    <>
      <Helmet title="SWUBase | Daily Snapshot" />
      {/* Full-page overlay header for DailySnapshots only */}
      {/*<div
        className="fixed top-0 left-0 right-0 h-[143px] w-screen overflow-hidden z-50 pointer-events-none"
        aria-label="Daily Snapshots header background"
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "url('https://images.swubase.com/thumbnails/header-noise-2800x300.webp')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 1,
          }}
        />
        <div className="absolute inset-0 bg-primary" style={{ opacity: 0.3 }} />
      </div>*/}
      {/* Spacer to prevent content from appearing under the fixed header */}
      <div className="h-[140px]" aria-hidden="true" />
      <div className="w-full mx-auto px-2 py-2">
        {/*<h1 className="text-2xl font-semibold mb-4">Daily Snapshot</h1>
        <p className="text-sm text-muted-foreground mb-6">Date: {today}</p>*/}

        {isLoading && <div className="text-sm text-muted-foreground">Loading daily snapshot…</div>}

        {isError && (
          <div className="text-sm text-red-500">
            Error: {error?.message ?? 'Failed to load daily snapshot'}
          </div>
        )}

        {!isLoading && !isError && sectionEntries.length === 0 && (
          <div className="text-sm text-muted-foreground">No sections available for this date.</div>
        )}

        <div
          className={cn(
            'grid gap-4',
            // 2 cols on small, then 3, 4, and your fixed 5-col layout at xl
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
            'auto-rows-[minmax(12rem,_auto)]',
            'grid-flow-dense',
          )}
        >
          {sectionEntries.map(([sectionName, payload]) => {
            const key = sectionName as OrderedKey;
            const Comp = (componentByKey as any)[key] as React.FC<{ payload: any } | undefined>;
            const sizing = (sizingByKey as any)[key] as SectionCardSizing | undefined;

            if (!sizing) {
              // Unknown sections: let the grid auto-place them as 1x1 cards.
              return (
                <div
                  key={sectionName}
                  className={cn('border rounded-lg bg-card p-4 shadow-sm h-full min-w-0')}
                >
                  <div className="font-medium mb-2 break-words">{sectionName}</div>
                  {Comp ? (
                    <Comp payload={payload} />
                  ) : (
                    <pre className="text-xs max-h-48 overflow-auto whitespace-pre-wrap bg-muted/40 p-2 rounded">
                      {JSON.stringify(payload, null, 2)}
                    </pre>
                  )}
                </div>
              );
            }

            return (
              <GridSection key={sectionName} sizing={sizing}>
                <div className={cn('border rounded-lg bg-card p-4 shadow-sm h-full min-w-0')}>
                  {/*<div className="font-medium mb-2 break-words">{sectionName}</div>*/}
                  {Comp ? (
                    <Comp payload={payload} />
                  ) : (
                    <pre className="text-xs max-h-48 overflow-auto whitespace-pre-wrap bg-muted/40 p-2 rounded">
                      {JSON.stringify(payload, null, 2)}
                    </pre>
                  )}
                </div>
              </GridSection>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default DailySnapshots;
