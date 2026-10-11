import { cn } from '@/lib/utils.ts';
import * as React from 'react';
import { useMemo } from 'react';
import { DailySnapshotRow } from '@/api/daily-snapshot';
import type {
  DailySnapshotSectionData,
  SectionRecentTournaments,
  SectionRecentTournamentsItem,
} from '../../../../../../../types/DailySnapshots.ts';
import { Trophy } from 'lucide-react';
import { SectionInfoTooltip } from '../components/SectionInfoTooltip.tsx';
import RecentTournamentsDropdownMenu from '@/components/app/daily-snapshots/sections/RecentTournaments/RecentTournamentsDropdownMenu.tsx';
import SectionHeader from '../components/SectionHeader.tsx';
import MetaEmptyState from '../components/MetaEmptyState.tsx';
import { useMatchHeightToElementId } from '@/hooks/useMatchHeightToElementId.tsx';
import { dailySnapshotFeaturedTournamentTypes } from '../../../../../../../types/Tournament.ts';
import { getDailySnapshotFormatSortOrder } from '../../../../../../../types/Format.ts';
import TournamentResultCard from './TournamentResultCard.tsx';

const openTournamentType = 'open';
const featuredTournamentTypes = new Set<string>(dailySnapshotFeaturedTournamentTypes);
const EMPTY_ITEMS: SectionRecentTournamentsItem[] = [];

export interface RecentTournamentsProps {
  payload: DailySnapshotSectionData<SectionRecentTournaments>;
  dailySnapshot?: DailySnapshotRow | null;
  sectionUpdatedAt?: string;
}

const RecentTournaments: React.FC<RecentTournamentsProps> = ({
  payload,
  dailySnapshot,
  sectionUpdatedAt,
}) => {
  const items = payload.data.tournaments ?? EMPTY_ITEMS;
  const scrollRef = useMatchHeightToElementId('s-recent-tournaments', true, h => `${h - 120}px`);

  // Sort tournaments by date desc, with Premier first for each date, then by updatedAt desc.
  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const da = new Date(a.tournament.date).getTime();
      const db = new Date(b.tournament.date).getTime();
      if (db !== da) return db - da;
      const formatOrder =
        getDailySnapshotFormatSortOrder(a.tournament.format) -
        getDailySnapshotFormatSortOrder(b.tournament.format);
      if (formatOrder !== 0) return formatOrder;
      const ua = new Date(a.tournament.updatedAt).getTime();
      const ub = new Date(b.tournament.updatedAt).getTime();
      return ub - ua;
    });
  }, [items]);

  const majors = useMemo(() => {
    return sorted.filter(it => {
      const type = String(it.tournament.type).toLowerCase();
      return type !== openTournamentType && featuredTournamentTypes.has(type);
    });
  }, [sorted]);
  const opens = useMemo(() => {
    return sorted.filter(it => String(it.tournament.type).toLowerCase() === openTournamentType);
  }, [sorted]);
  const others = useMemo(() => {
    return sorted.filter(
      it => !featuredTournamentTypes.has(String(it.tournament.type).toLowerCase()),
    );
  }, [sorted]);

  // Grouping helper by exact date (for divider rendering) - for others only
  const rows = useMemo(() => {
    type Row = { type: 'divider'; label: string } | { type: 'item'; item: (typeof items)[number] };
    const res: Row[] = [];
    let currentKey: string | null = null;
    for (const it of others) {
      const rawDate = it.tournament.date; // assume YYYY-MM-DD
      const key =
        (rawDate as string)?.slice(0, 10) ||
        new Date(it.tournament.date).toISOString().slice(0, 10);
      if (key !== currentKey) {
        currentKey = key;
        const label = new Date(`${key}T12:00:00Z`).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        });
        res.push({ type: 'divider', label });
      }
      res.push({ type: 'item', item: it });
    }
    return res;
  }, [others]);

  const groups = useMemo(
    () => (payload.data.tournamentGroupExt ? [payload.data.tournamentGroupExt] : []),
    [payload.data.tournamentGroupExt],
  );

  return (
    <div
      className={cn(
        'meta-section-content meta-recent-content flex flex-col gap-4.5 w-full h-full min-w-0 min-h-110',
        'md:min-h-0',
      )}
    >
      <SectionHeader
        title="Recent tournaments"
        icon={Trophy}
        info={
          <>
            <SectionInfoTooltip
              dailySnapshot={dailySnapshot}
              sectionUpdatedAt={sectionUpdatedAt}
              tournamentGroupExtendedInfo={groups}
            >
              <div className="text-sm">
                Premier, Eternal, and limited major tournaments from the last 2 weeks, plus all
                featured tournaments from the last 30 days. Winners and decks are shown when results
                are available from melee.gg.
              </div>
            </SectionInfoTooltip>
          </>
        }
        dropdownMenu={<RecentTournamentsDropdownMenu />}
      />

      {sorted.length === 0 ? (
        <MetaEmptyState title="No recent tournaments" icon={Trophy}>
          Results from recent events will appear here.
        </MetaEmptyState>
      ) : (
        <div
          ref={scrollRef}
          className={cn(
            'meta-event-scroll min-h-0 overflow-auto [scrollbar-width:thin] -ml-5 pl-6 pr-1 pt-[7px] pb-0.5',
            '[&_>_.meta-event-group_+_.meta-event-group]:mt-4.5',
          )}
          id="section-recent-tournaments"
        >
          {majors.length > 0 && (
            <div
              className={cn(
                'meta-event-group flex flex-col gap-2',
                '[&_>_.meta-subheading]:mb-0.5!',
              )}
            >
              <h4
                className={cn(
                  'meta-subheading mx-0! mt-0! mb-2.5! text-[11px]! font-semibold! text-muted-foreground',
                  'tracking-[0.055em]! uppercase',
                )}
              >
                Major tournaments
              </h4>
              {majors.map(item => (
                <TournamentResultCard
                  key={item.tournament.id}
                  item={item}
                  featured
                  showDate
                  fullName
                />
              ))}
            </div>
          )}

          {opens.length > 0 && (
            <div
              className={cn(
                'meta-event-group flex flex-col gap-2',
                '[&_>_.meta-subheading]:mb-0.5!',
              )}
            >
              <h4
                className={cn(
                  'meta-subheading mx-0! mt-0! mb-2.5! text-[11px]! font-semibold! text-muted-foreground',
                  'tracking-[0.055em]! uppercase',
                )}
              >
                Opens
              </h4>
              {opens.map(item => (
                <TournamentResultCard key={item.tournament.id} item={item} showDate fullName />
              ))}
            </div>
          )}

          {rows.length > 0 && (
            <div
              className={cn(
                'meta-event-group flex flex-col gap-2',
                '[&_>_.meta-subheading]:mb-0.5!',
              )}
            >
              {rows.map((row, index) =>
                row.type === 'divider' ? (
                  <h4
                    key={`date-${index}`}
                    className={cn(
                      'meta-event-date-divider flex items-center gap-[9px] mx-0! mt-2! mb-0.5! text-[11px]! font-medium!',
                      'text-muted-foreground',
                      "[&::after]:content-[''] [&::after]:flex-1 [&::after]:h-px [&::after]:bg-border",
                    )}
                  >
                    {row.label}
                  </h4>
                ) : (
                  <TournamentResultCard key={row.item.tournament.id} item={row.item} />
                ),
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecentTournaments;
