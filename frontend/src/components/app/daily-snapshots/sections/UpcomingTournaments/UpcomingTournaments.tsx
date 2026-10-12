import { cn } from '@/lib/utils.ts';
import { CalendarDays } from 'lucide-react';
import * as React from 'react';
import { useMemo } from 'react';
import { DailySnapshotRow } from '@/api/daily-snapshot';
import type {
  DailySnapshotSectionData,
  SectionUpcomingTournaments,
} from '../../../../../../../types/DailySnapshots.ts';
import { SectionInfoTooltip } from '../components/SectionInfoTooltip.tsx';
import { getDailySnapshotFormatSortOrder } from '../../../../../../../types/Format.ts';
import UpcomingTournamentsDropdownMenu from '@/components/app/daily-snapshots/sections/UpcomingTournaments/UpcomingTournamentsDropdownMenu.tsx';
import SectionHeader from '../components/SectionHeader.tsx';
import MetaEmptyState from '../components/MetaEmptyState.tsx';
import UpcomingTournamentCard from './UpcomingTournamentCard.tsx';

const EMPTY_TOURNAMENTS: SectionUpcomingTournaments['dataPoints'] = [];

export interface UpcomingTournamentsProps {
  payload: DailySnapshotSectionData<SectionUpcomingTournaments>;
  dailySnapshot?: DailySnapshotRow | null;
  sectionUpdatedAt?: string;
}

const UpcomingTournaments: React.FC<UpcomingTournamentsProps> = ({
  payload,
  dailySnapshot,
  sectionUpdatedAt,
}) => {
  const tournaments = payload.data.dataPoints ?? EMPTY_TOURNAMENTS;
  const majors = payload.data.upcomingMajorTournaments ?? EMPTY_TOURNAMENTS;

  // Sort by date ascending (soonest first), with Premier first for each date.
  const sorted = useMemo(() => {
    return [...tournaments].sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      if (da !== db) return da - db;
      const formatOrder =
        getDailySnapshotFormatSortOrder(a.format) - getDailySnapshotFormatSortOrder(b.format);
      if (formatOrder !== 0) return formatOrder;
      const ua = a.updatedAt ? new Date(a.updatedAt as unknown as string).getTime() : 0;
      const ub = b.updatedAt ? new Date(b.updatedAt as unknown as string).getTime() : 0;
      return ub - ua;
    });
  }, [tournaments]);

  const sortedMajors = useMemo(() => {
    return majors
      .filter(tournament => tournament.type.toLowerCase() !== 'open')
      .sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        if (da !== db) return da - db;
        const formatOrder =
          getDailySnapshotFormatSortOrder(a.format) - getDailySnapshotFormatSortOrder(b.format);
        if (formatOrder !== 0) return formatOrder;
        const ua = a.updatedAt ? new Date(a.updatedAt as unknown as string).getTime() : 0;
        const ub = b.updatedAt ? new Date(b.updatedAt as unknown as string).getTime() : 0;
        return ub - ua;
      });
  }, [majors]);

  const groups = useMemo(
    () => (payload.data.tournamentGroupExt ? [payload.data.tournamentGroupExt] : []),
    [payload.data.tournamentGroupExt],
  );

  return (
    <div className="meta-section-content flex flex-col gap-4.5 w-full h-full min-w-0">
      <SectionHeader
        title="Upcoming tournaments"
        icon={CalendarDays}
        info={
          <>
            <SectionInfoTooltip
              dailySnapshot={dailySnapshot}
              sectionUpdatedAt={sectionUpdatedAt}
              tournamentGroupExtendedInfo={groups}
            >
              <div className="text-sm">
                Premier, Eternal, and limited events for the current or upcoming weekend, plus
                Sector Qualifiers, Regional Qualifiers, and Galactic Championships in the next 30
                days.
              </div>
            </SectionInfoTooltip>
          </>
        }
        dropdownMenu={<UpcomingTournamentsDropdownMenu />}
      />

      <div className="meta-upcoming-list flex flex-col gap-4.5 max-h-115 min-h-0 overflow-auto p-0.5 [scrollbar-width:thin]">
        {sortedMajors.length > 0 && (
          <div
            className={cn('meta-event-group flex flex-col gap-2', '[&_>_.meta-subheading]:mb-0.5!')}
          >
            <h4
              className={cn(
                'meta-subheading mx-0! mt-0! mb-2.5! text-[11px]! font-semibold! text-muted-foreground',
                'tracking-[0.055em]! uppercase',
              )}
            >
              Major tournaments
            </h4>
            {sortedMajors.map(tournament => (
              <UpcomingTournamentCard key={tournament.id} tournament={tournament} featured />
            ))}
          </div>
        )}
        {sorted.length > 0 && (
          <div
            className={cn('meta-event-group flex flex-col gap-2', '[&_>_.meta-subheading]:mb-0.5!')}
          >
            <h4
              className={cn(
                'meta-subheading mx-0! mt-0! mb-2.5! text-[11px]! font-semibold! text-muted-foreground',
                'tracking-[0.055em]! uppercase',
              )}
            >
              {payload.title === 'Current weekend' ? 'This weekend' : 'Upcoming weekend'}
            </h4>
            {sorted.map(tournament => (
              <UpcomingTournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        )}
        {sorted.length === 0 && sortedMajors.length === 0 && (
          <MetaEmptyState title="More events on the horizon" icon={CalendarDays}>
            Upcoming tournaments will be listed here.
          </MetaEmptyState>
        )}
      </div>
    </div>
  );
};

export default UpcomingTournaments;
