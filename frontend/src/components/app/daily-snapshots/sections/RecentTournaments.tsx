import * as React from 'react';
import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { DailySnapshotRow } from '@/api/daily-snapshot';
import type {
  DailySnapshotSectionData,
  SectionRecentTournaments,
} from '../../../../../../types/DailySnapshots.ts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TournamentGivenDeckTooltip } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/TournamentGivenDeckTooltip.tsx';
import Flag from '@/components/app/global/Flag.tsx';
import { Users, X } from 'lucide-react';
import { CountryCode } from '../../../../../../server/db/lists.ts';
import { SectionInfoTooltip } from './components/SectionInfoTooltip.tsx';

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
  const items = payload.data.tournaments ?? [];

  // Sort tournaments by date desc, then by updatedAt desc
  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const da = new Date(a.tournament.date).getTime();
      const db = new Date(b.tournament.date).getTime();
      if (db !== da) return db - da;
      const ua = new Date(a.tournament.updatedAt).getTime();
      const ub = new Date(b.tournament.updatedAt).getTime();
      return ub - ua;
    });
  }, [items]);

  // Grouping helper by exact date (for divider rendering)
  const rows = useMemo(() => {
    type Row = { type: 'divider'; label: string } | { type: 'item'; item: (typeof items)[number] };
    const res: Row[] = [];
    let currentKey: string | null = null;
    for (const it of sorted) {
      const rawDate = it.tournament.date; // assume YYYY-MM-DD
      const key = rawDate?.slice(0, 10) || new Date(it.tournament.date).toISOString().slice(0, 10);
      if (key !== currentKey) {
        currentKey = key;
        const label = new Date(it.tournament.date).toLocaleDateString();
        res.push({ type: 'divider', label });
      }
      res.push({ type: 'item', item: it });
    }
    return res;
  }, [sorted, items]);

  const groups = useMemo(
    () => (payload.data.tournamentGroupExt ? [payload.data.tournamentGroupExt] : []),
    [payload.data.tournamentGroupExt],
  );

  return (
    <div className="w-full h-full">
      <div className="flex gap-2 justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <h3>Recent tournaments</h3>
          <SectionInfoTooltip
            dailySnapshot={dailySnapshot}
            sectionUpdatedAt={sectionUpdatedAt}
            tournamentGroupExtendedInfo={groups}
          >
            <div className="text-sm">
              Recently finished tournaments are listed by date (most recent first). Hover any row to
              see the winning deck. Rows marked with an X are not yet imported.
            </div>
          </SectionInfoTooltip>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="text-sm text-muted-foreground">No recent tournaments</div>
      ) : (
        <div className="h-[700px] overflow-y-scroll overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((row, idx) => {
                if (row.type === 'divider') {
                  return (
                    <tr key={`div-${idx}`} className="bg-muted/40">
                      <td className="py-1 px-2 font-medium" colSpan={3}>
                        {row.label}
                      </td>
                    </tr>
                  );
                }

                const t = row.item.tournament;
                const countryCode = t.location as CountryCode;
                const notImported = !t.imported;

                return (
                  <TooltipProvider key={t.id}>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <tr className="border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-muted/50">
                          <td className="py-2">
                            <div className="flex items-center">
                              <Flag countryCode={countryCode} className="mr-2" />
                              <Link to="/tournaments/$tournamentId" params={{ tournamentId: t.id }}>
                                {t.name}
                              </Link>
                            </div>
                          </td>
                          <td className="py-2 text-right">
                            {t.attendance > 0 ? (
                              <div className="flex items-center justify-end gap-1">
                                <Users className="h-3 w-3 text-muted-foreground" />
                                <span>{t.attendance}</span>
                              </div>
                            ) : null}
                          </td>
                          <td className="py-2 text-right pr-2">
                            {notImported ? (
                              <X className="h-4 w-4 text-red-500 inline-block" />
                            ) : null}
                          </td>
                        </tr>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="p-0">
                        <TournamentGivenDeckTooltip deck={row.item.deck} />
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RecentTournaments;
