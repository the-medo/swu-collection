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
import GridSection, { SectionCardSizing } from '@/components/app/daily-snapshots/GridSection.tsx';
import { motion } from 'framer-motion';
import type { DailySnapshotSectionData } from '../../../../../types/DailySnapshots.ts';
import { DISCORD_LINK, PATREON_LINK } from '../../../../../shared/consts/constants.ts';

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
    3: { row: { from: 1, to: 1 }, col: { from: 3, to: 3 } },
    2: { row: { from: 2, to: 2 }, col: { from: 2, to: 2 } },
    1: { row: { from: 3, to: 3 }, col: { from: 1, to: 1 } },
  },
  'upcoming-tournaments': {
    4: { row: { from: 3, to: 3 }, col: { from: 4, to: 4 } },
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
      <div className="xxh-[140px] flex gap-4 justify-between" aria-hidden="true">
        <div className="flex flex-1 flex-col" aria-hidden="true">
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center font-medium text-foreground/80 mb-0"
          >
            <span className="font-[400]">SWU</span>
            <span className="font-[700]">BASE</span>
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

        <div className="flex flex-col items-center gap-2 py-2">
          <a
            href={DISCORD_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg transition-colors duration-200 text-[11px] font-medium opacity-80"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
            </svg>
            Discord
          </a>
          <a
            href={PATREON_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-[#FF424D] hover:bg-[#E63946] text-white rounded-lg transition-colors duration-200 text-[11px] font-medium opacity-80"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 436 476"
              className="w-4 h-4"
              fill="currentColor"
            >
              <title>Patreon logo</title>
              <path d="M436 143c-.084-60.778-47.57-110.591-103.285-128.565C263.528-7.884 172.279-4.649 106.214 26.424 26.142 64.089.988 146.596.051 228.883c-.77 67.653 6.004 245.841 106.83 247.11 74.917.948 86.072-95.279 120.737-141.623 24.662-32.972 56.417-42.285 95.507-51.929C390.309 265.865 436.097 213.011 436 143Z"></path>
            </svg>
            Patreon
          </a>
        </div>
      </div>
      <div className="w-full mx-auto px-2 py-2">
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
                  className={cn('border rounded-lg bg-card p-4 shadow-sm h-full min-w-0')}
                >
                  <div className="font-medium mb-2 break-words">{sectionName}</div>
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
              <GridSection key={sectionName} sizing={sizing}>
                <div
                  className={cn(
                    'border rounded-lg bg-card p-4 shadow-sm h-full min-w-0 flex flex-col min-h-0',
                  )}
                >
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
        </div>
      </div>
    </>
  );
};

export default DailySnapshots;
