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
import { motion } from 'framer-motion';
import type { DailySnapshotSectionData } from '../../../../../types/DailySnapshots.ts';
import SocialButtons from '@/components/app/global/SocialButtons.tsx';
import FallbackPage from '@/components/app/daily-snapshots/FallbackPage.tsx';
import GridSectionContent from '@/components/app/global/GridSection/GridSectionContent.tsx';
import TournamentDetailSection from '@/components/app/daily-snapshots/special-sections/TournamentDetailSection/TournamentDetailSection.tsx';
import { useSearch } from '@tanstack/react-router';

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
  const { data, isLoading, isError, error } = useDailySnapshot(today);
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
      {/* Spacer to prevent content from appearing under the fixed header */}
      <div className="flex gap-4 justify-between" aria-hidden="true">
        <div className="flex flex-1 flex-col" aria-hidden="true">
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center font-medium text-foreground/80 mb-0"
          >
            <span className="font-normal">SWU</span>
            <span className="font-bold">BASE</span>
          </motion.h1>
          <motion.h4
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center font-medium  text-foreground/80"
          >
            Your Ultimate Star Wars: Unlimited Companion
          </motion.h4>
        </div>

        <SocialButtons location="header" />
      </div>
      <div className="w-full mx-auto px-2 py-2" id="section-container">
        {isLoading && <div className="text-sm text-muted-foreground">Loading daily snapshot…</div>}

        {isError && (
          <div className="text-sm text-red-500">
            Error: {error?.message ?? 'Failed to load daily snapshot'}
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
                <div
                  key={sectionName}
                  className={cn('border rounded-lg bg-card p-4 shadow-xs h-full min-w-0')}
                >
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
              <GridSection key={sectionName} sizing={sizing} id={`s-${sectionName}`}>
                <GridSectionContent>
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
                </GridSectionContent>
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
