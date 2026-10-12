import * as React from 'react';
import { Helmet } from 'react-helmet-async';
import { DailySnapshotRow, useDailySnapshot } from '@/api/daily-snapshot/useDailySnapshot.ts';
import {
  MetaShareTwoWeeks,
  ForceVsNonforce,
  UpcomingTournaments,
  WeeklyChange,
  RecentTournaments,
  MostPlayedCards,
} from './sections';
import { cn } from '@/lib/utils.ts';
import GridSection, {
  SectionCardSizing,
} from '@/components/app/global/GridSection/GridSection.tsx';
import type { DailySnapshotSectionData } from '../../../../../types/DailySnapshots.ts';
import FallbackPage from '@/components/app/daily-snapshots/FallbackPage.tsx';
import TournamentDetailSection from '@/components/app/daily-snapshots/special-sections/TournamentDetailSection/TournamentDetailSection.tsx';
import { useSearch } from '@tanstack/react-router';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';

const metaPanelClassName = cn(
  'meta-panel @container/meta-panel h-full min-w-0 p-5 border border-border rounded-[20px] bg-card',
  'shadow-[0_2px_8px_hsl(var(--foreground)_/_0.025)]',
  '[#s-meta-share-2-weeks_>_&]:border-[color:var(--meta-line)]',
  '[#s-meta-share-2-weeks_>_&]:[background:linear-gradient(130deg,_var(--meta-tint),_hsl(var(--card))_65%)]',
  '[#s-recent-tournaments_>_&]:p-4',
  '[#s-upcoming-tournaments_>_&]:p-4',
  'max-tablet-small:p-4 max-tablet-small:rounded-[17px]',
);

const formatToday = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const sectionKeys = [
  'meta-share-2-weeks',
  'force-vs-nonforce',
  'upcoming-tournaments',
  'weekly-change',
  'recent-tournaments',
  'most-played-cards',
] as const;

export type SectionKey = (typeof sectionKeys)[number];

const componentByKey: Record<SectionKey, React.FC<{ payload: any }>> = {
  'meta-share-2-weeks': MetaShareTwoWeeks,
  'force-vs-nonforce': ForceVsNonforce,
  'upcoming-tournaments': UpcomingTournaments,
  'weekly-change': WeeklyChange,
  'recent-tournaments': RecentTournaments,
  'most-played-cards': MostPlayedCards,
};

const sizingByKey: Record<SectionKey, SectionCardSizing> = {
  'meta-share-2-weeks': {
    4: { row: { from: 1, to: 1 }, col: { from: 1, to: 3 } },
    3: { row: { from: 1, to: 1 }, col: { from: 1, to: 2 } },
    2: { row: { from: 1, to: 1 }, col: { from: 1, to: 2 } },
    1: { row: { from: 1, to: 1 }, col: { from: 1, to: 1 } },
  },
  'force-vs-nonforce': {
    4: { row: { from: 2, to: 2 }, col: { from: 3, to: 3 } },
    3: { row: { from: 2, to: 2 }, col: { from: 3, to: 3 } },
    2: { row: { from: 2, to: 2 }, col: { from: 2, to: 2 } },
    1: { row: { from: 3, to: 3 }, col: { from: 1, to: 1 } },
  },
  'upcoming-tournaments': {
    4: { row: { from: 3, to: 3 }, col: { from: 4, to: 4 } },
    3: { row: { from: 3, to: 3 }, col: { from: 3, to: 3 } },
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
    3: { row: { from: 1, to: 1 }, col: { from: 3, to: 3 } },
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

export const specialSectionSizing: Record<string, SectionCardSizing> = {
  'tournament-detail': {
    4: { row: { from: 1, to: 1 }, col: { from: 1, to: 3 } },
    3: { row: { from: 1, to: 1 }, col: { from: 1, to: 2 } },
    2: { row: { from: 1, to: 1 }, col: { from: 1, to: 2 } },
    1: { row: { from: 1, to: 1 }, col: { from: 1, to: 1 } },
  },
};

const DailySnapshots: React.FC = () => {
  const today = React.useMemo(() => formatToday(), []);
  const { data, isLoading, isError, refetch, isFetching } = useDailySnapshot(today);
  const { maTournamentId } = useSearch({ strict: false });

  const sections = data?.sections ?? {};

  // ensure we render in the desired order first, then any other sections returned by API
  const knownEntries = sectionKeys
    .filter(key => sections[key])
    .map(key => [key, sections[key]] as const);
  const otherEntries = Object.entries(sections).filter(
    ([key]) => !sectionKeys.includes(key as SectionKey),
  );
  const sectionEntries = [...knownEntries, ...otherEntries];

  return (
    <>
      <Helmet title="SWUBase | Star Wars: Unlimited Meta Analysis & Deckbuilding" />
      <div
        className={cn(
          'meta-home [--meta-accent:#326149] [--meta-tint:#edf2e9] [--meta-line:#d5e0cd] w-full max-w-380 my-0',
          'mx-auto px-4 pt-2 pb-9',
          'dark:[--meta-accent:#b9d4a8] dark:[--meta-tint:#1d2720] dark:[--meta-line:#364437]',
          'max-tablet-small:pb-6',
          'max-mobile:px-2',
        )}
        id="section-container"
      >
        {isLoading && (
          <div
            className={cn(
              'meta-loading grid grid-cols-[2fr_1fr] gap-4',
              'max-tablet-small:grid-cols-1',
            )}
            role="status"
            aria-label="Loading two-week meta"
          >
            <span className="sr-only">Loading two-week meta…</span>
            {[0, 1, 2].map(index => (
              <div
                key={index}
                className={cn(
                  'meta-panel meta-skeleton @container/meta-panel h-full min-w-0 p-5 border border-border rounded-[20px]',
                  'bg-card shadow-[0_2px_8px_hsl(var(--foreground)_/_0.025)]',
                  '[#s-meta-share-2-weeks_>_&]:border-[color:var(--meta-line)]',
                  '[#s-meta-share-2-weeks_>_&]:[background:linear-gradient(130deg,_var(--meta-tint),_hsl(var(--card))_65%)]',
                  '[#s-recent-tournaments_>_&]:p-4',
                  '[#s-upcoming-tournaments_>_&]:p-4',
                  'max-tablet-small:p-4 max-tablet-small:rounded-[17px]',
                  'min-h-67.5 [background:linear-gradient(120deg,_var(--meta-tint),_hsl(var(--muted)_/_0.3))]',
                  'first-of-type:row-span-2',
                )}
                aria-hidden="true"
              />
            ))}
          </div>
        )}

        {isError && (
          <div
            className={cn(
              'meta-error flex items-center flex-wrap gap-3.5 p-6 mb-4 border border-border rounded-[20px] bg-card',
              '[&_>_svg]:text-muted-foreground',
              '[&_>_div]:flex-1 [&_>_div]:min-w-45 [&_>_div]:text-[14px]',
            )}
            role="alert"
          >
            <AlertCircle size={20} aria-hidden="true" />
            <div>
              <strong>Unable to load the meta snapshot</strong>
              <p className="mx-0! mt-1! mb-0! text-[12px]! text-muted-foreground">
                Please try again in a moment.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              <RefreshCw size={14} aria-hidden="true" />
              {isFetching ? 'Retrying…' : 'Try again'}
            </Button>
          </div>
        )}

        {!isLoading && !isError && sectionEntries.length === 0 && <FallbackPage />}

        <div
          className={cn(
            'grid gap-4 grid-flow-dense',
            'auto-rows-[minmax(12rem,auto)]',
            'grid-cols-1',
            'md:grid-cols-2',
            'lg:grid-cols-[repeat(2,minmax(0,1fr))_280px]',
            'xl:grid-cols-[repeat(3,minmax(0,1fr))_280px]',
          )}
        >
          {sectionEntries.map(([sectionName, payload]) => {
            const key = sectionName as SectionKey;
            const Comp = (componentByKey as any)[key] as React.FC<{
              payload: DailySnapshotSectionData<any>;
              dailySnapshot?: DailySnapshotRow | null;
              sectionUpdatedAt?: string;
            }>;
            const sizing = (sizingByKey as any)[key] as SectionCardSizing | undefined;

            if (!sizing) {
              // Unknown sections: let the grid auto-place them as 1x1 cards.
              return (
                <div key={sectionName} className={metaPanelClassName}>
                  <div className="font-medium mb-2 wrap-break-word">{sectionName}</div>
                  {Comp ? (
                    <Comp
                      payload={payload}
                      dailySnapshot={data?.dailySnapshot}
                      sectionUpdatedAt={data?.updatedAtMap?.[payload.id]}
                    />
                  ) : (
                    <pre className="text-xs max-h-48 overflow-auto whitespace-pre-wrap bg-muted/40 p-2 rounded">
                      {JSON.stringify(payload, null, 2)}
                    </pre>
                  )}
                </div>
              );
            }

            return (
              <GridSection
                key={sectionName}
                sizing={sizing}
                id={`s-${sectionName}`}
                className="meta-section"
              >
                <div className={metaPanelClassName}>
                  {Comp ? (
                    <Comp
                      payload={payload}
                      dailySnapshot={data?.dailySnapshot}
                      sectionUpdatedAt={data?.updatedAtMap?.[payload.id]}
                    />
                  ) : (
                    <pre className="text-xs max-h-48 overflow-auto whitespace-pre-wrap bg-muted/40 p-2 rounded">
                      {JSON.stringify(payload, null, 2)}
                    </pre>
                  )}
                </div>
              </GridSection>
            );
          })}
          {maTournamentId && <TournamentDetailSection maTournamentId={maTournamentId} />}
        </div>
      </div>
    </>
  );
};

export default DailySnapshots;
