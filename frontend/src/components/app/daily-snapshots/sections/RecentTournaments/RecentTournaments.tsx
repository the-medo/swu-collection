import * as React from 'react';
import { useMemo } from 'react';
import { DailySnapshotRow } from '@/api/daily-snapshot';
import type {
  DailySnapshotSectionData,
  SectionRecentTournaments,
  SectionRecentTournamentsItem,
} from '../../../../../../../types/DailySnapshots.ts';
import { X } from 'lucide-react';
import { SectionInfoTooltip } from '../components/SectionInfoTooltip.tsx';
import TournamentGroupTournament, {
  type TournamentGroupTournamentDisplayItem,
} from '@/components/app/tournaments/TournamentGroup/TournamentGroupTournament.tsx';
import RecentTournamentsDropdownMenu from '@/components/app/daily-snapshots/sections/RecentTournaments/RecentTournamentsDropdownMenu.tsx';
import SectionHeader from '../components/SectionHeader.tsx';
import type { TournamentGroupTournament as TournamentGroupTournamentType } from '../../../../../../../types/TournamentGroup.ts';
import TournamentOverviewTable from '@/components/app/tournaments/components/TournamentOverviewTable.tsx';
import { useMatchHeightToElementId } from '@/hooks/useMatchHeightToElementId.tsx';
import { useTournamentOverviewTableRowClick } from '@/components/app/tournaments/lib/useTournamentOverviewTableRowClick.ts';
import { dailySnapshotFeaturedTournamentTypes } from '../../../../../../../types/Tournament.ts';
import { getDailySnapshotFormatSortOrder } from '../../../../../../../types/Format.ts';
import TournamentFormatBadge from '../components/TournamentFormatBadge.tsx';

// Split featured tournaments and others (to keep the table for others only)
const majorTypes = new Set<string>(dailySnapshotFeaturedTournamentTypes);
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
  const handleRowClick = useTournamentOverviewTableRowClick();
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
    return sorted.filter(it => majorTypes.has(String(it.tournament.type).toLowerCase()));
  }, [sorted]);
  const others = useMemo(() => {
    return sorted.filter(it => !majorTypes.has(String(it.tournament.type).toLowerCase()));
  }, [sorted]);

  // Adapt featured tournaments to display cards. A winning deck is optional.
  const majorsAdapted = useMemo(() => {
    const res: TournamentGroupTournamentDisplayItem[] = [];
    for (const it of majors) {
      const t = it.tournament;
      const tournamentForCard = {
        ...t,
        // Ensure date fields are Date instances for the consumer component
        date: new Date(t.date as string),
        createdAt: new Date(t.createdAt as string),
        updatedAt: new Date(t.updatedAt as string),
      } as unknown as TournamentGroupTournamentType['tournament'];
      const adapted: TournamentGroupTournamentDisplayItem = {
        tournament: tournamentForCard,
        deck: it.deck,
        tournamentDeck:
          (it.winningTournamentDeck as unknown as TournamentGroupTournamentType['tournamentDeck']) ??
          null,
        tournamentType:
          t as unknown as TournamentGroupTournamentType['tournament'] as unknown as TournamentGroupTournamentType['tournamentType'],
        position: 0,
      } as TournamentGroupTournamentDisplayItem;
      res.push(adapted);
    }
    return res;
  }, [majors]);

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
        const label = new Date(it.tournament.date).toLocaleDateString();
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
    <div className="w-full h-full flex flex-col gap-2 min-h-[500px] md:min-h-0">
      <SectionHeader
        headerAndTooltips={
          <>
            <h4>Recent tournaments</h4>
            <SectionInfoTooltip
              dailySnapshot={dailySnapshot}
              sectionUpdatedAt={sectionUpdatedAt}
              tournamentGroupExtendedInfo={groups}
            >
              <div className="text-sm">
                Premier, Eternal, and limited major tournaments from the last 2 weeks, plus all
                featured tournaments from the last 30 days. Rows marked with{' '}
                <X className="h-4 w-4 text-red-500 inline-block" /> are not yet imported (and maybe
                won't be, depending on the data that is provided from melee.gg).
              </div>
            </SectionInfoTooltip>
          </>
        }
        dropdownMenu={<RecentTournamentsDropdownMenu />}
      />

      {sorted.length === 0 ? (
        <div className="text-sm text-muted-foreground">No recent tournaments</div>
      ) : (
        <div
          ref={scrollRef}
          className="min-h-0 overflow-auto pr-2 -mr-2 @container/recent-tournaments"
          id="section-recent-tournaments"
        >
          {/* Major tournaments section */}
          {majorsAdapted.length > 0 && (
            <div className="mb-4">
              <h4 className="text-base font-semibold mb-2">Major tournaments</h4>
              <div className="flex flex-col gap-2">
                {majorsAdapted.map(mi => (
                  <div
                    key={mi.tournament.id}
                    className="min-h-[150px]"
                    onMouseDown={e => handleRowClick(e, mi.tournament.id)}
                  >
                    <TournamentGroupTournament
                      tournamentItem={mi}
                      compact={true}
                      formatBadge={<TournamentFormatBadge formatId={mi.tournament.format} />}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <TournamentOverviewTable
            rows={rows}
            formatBadgeRenderer={formatId => <TournamentFormatBadge formatId={formatId} />}
          />
        </div>
      )}
    </div>
  );
};

export default RecentTournaments;
