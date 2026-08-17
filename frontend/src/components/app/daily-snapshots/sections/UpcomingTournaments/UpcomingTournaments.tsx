import * as React from 'react';
import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { DailySnapshotRow } from '@/api/daily-snapshot';
import type {
  DailySnapshotSectionData,
  SectionUpcomingTournaments,
} from '../../../../../../../types/DailySnapshots.ts';
import Flag from '@/components/app/global/Flag.tsx';
import { CountryCode } from '../../../../../../../server/db/lists.ts';
import { SectionInfoTooltip } from '../components/SectionInfoTooltip.tsx';
import {
  formatDataById,
  getDailySnapshotFormatSortOrder,
} from '../../../../../../../types/Format.ts';
import UpcomingTournamentsDropdownMenu from '@/components/app/daily-snapshots/sections/UpcomingTournaments/UpcomingTournamentsDropdownMenu.tsx';
import SectionHeader from '../components/SectionHeader.tsx';
import TournamentFormatBadge from '../components/TournamentFormatBadge.tsx';

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
    return [...majors].sort((a, b) => {
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

  // Group rows by exact date for divider rendering
  const rows = useMemo(() => {
    type Row =
      | { type: 'divider'; label: string }
      | { type: 'item'; item: (typeof tournaments)[number] };
    const res: Row[] = [];
    let currentKey: string | null = null;
    for (const it of sorted) {
      const key = (it.date as string)?.slice(0, 10) || new Date(it.date).toISOString().slice(0, 10);
      if (key !== currentKey) {
        currentKey = key;
        const label = new Date(it.date).toLocaleDateString();
        res.push({ type: 'divider', label });
      }
      res.push({ type: 'item', item: it });
    }
    return res;
  }, [sorted]);

  const groups = useMemo(
    () => (payload.data.tournamentGroupExt ? [payload.data.tournamentGroupExt] : []),
    [payload.data.tournamentGroupExt],
  );

  return (
    <div className="w-full h-full flex flex-col gap-2">
      <SectionHeader
        headerAndTooltips={
          <>
            <h4>Upcoming tournaments</h4>
            <SectionInfoTooltip
              dailySnapshot={dailySnapshot}
              sectionUpdatedAt={sectionUpdatedAt}
              tournamentGroupExtendedInfo={groups}
            >
              <div className="text-sm">
                Premier, Eternal, and limited major tournaments for next weekend, plus all featured
                tournaments happening in the next 30 days.
              </div>
            </SectionInfoTooltip>
          </>
        }
        dropdownMenu={<UpcomingTournamentsDropdownMenu />}
      />

      <div className="max-h-[400px] overflow-y-auto overflow-x-auto pr-2 -mr-2 flex flex-col gap-2">
        {/* Major tournaments each in its own box */}
        {sortedMajors.length > 0 &&
          sortedMajors.map(m => {
            const cc = (m.location as unknown as CountryCode) || undefined;
            return (
              <div
                key={m.id}
                className="p-3 rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-900 flex flex-col"
              >
                <div className="flex flex-1 items-center justify-between gap-2 flex-wrap">
                  <div className="flex flex-1 items-center gap-2 min-w-[200px]">
                    {cc ? <Flag countryCode={cc} /> : null}
                    <TournamentFormatBadge formatId={m.format} />
                    {m.id ? (
                      <Link
                        to="/tournaments/$tournamentId"
                        params={{ tournamentId: m.id }}
                        className="text-blue-700 dark:text-blue-300 hover:underline"
                      >
                        {m.name}
                      </Link>
                    ) : (
                      <span>{m.name}</span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-3 pl-3 shrink-0">
                    {m.format ? (
                      <span className="text-xs text-muted-foreground">
                        ({formatDataById[m.format]?.name})
                      </span>
                    ) : null}
                    <span>{new Date(m.date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            );
          })}

        {sorted.length === 0 ? (
          <div className="text-sm text-muted-foreground">No upcoming tournaments</div>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {rows.map((row, idx) => {
                if (row.type === 'divider') {
                  return (
                    <tr key={`div-${idx}`} className="bg-muted/40">
                      <td className="py-1 px-2 font-medium" colSpan={2}>
                        {row.label}
                      </td>
                    </tr>
                  );
                }

                const t = row.item;
                const countryCode = (t.location as unknown as CountryCode) || undefined;

                return (
                  <tr key={t.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        {countryCode ? <Flag countryCode={countryCode} className="mr-2" /> : null}
                        <TournamentFormatBadge formatId={t.format} />
                        {t.id ? (
                          <Link to="/tournaments/$tournamentId" params={{ tournamentId: t.id }}>
                            {t.name}
                          </Link>
                        ) : (
                          <span>{t.name}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 text-right pr-2 text-[10px]">
                      {t.continent === 'North America' ? 'NA' : t.continent}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default UpcomingTournaments;
