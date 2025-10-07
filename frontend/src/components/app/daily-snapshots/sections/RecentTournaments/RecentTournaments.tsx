import * as React from 'react';
import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { DailySnapshotRow } from '@/api/daily-snapshot';
import type {
  DailySnapshotSectionData,
  SectionRecentTournaments,
} from '../../../../../../../types/DailySnapshots.ts';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx';
import { TournamentGivenDeckTooltip } from '@/components/app/tournaments/pages/TournamentsPlanetaryQualifiers/TournamentGivenDeckTooltip.tsx';
import Flag from '@/components/app/global/Flag.tsx';
import { Users, X } from 'lucide-react';
import { CountryCode } from '../../../../../../../server/db/lists.ts';
import { SectionInfoTooltip } from '../components/SectionInfoTooltip.tsx';
import TournamentGroupTournament from '@/components/app/tournaments/TournamentGroup/TournamentGroupTournament.tsx';
import RecentTournamentsDropdownMenu from '@/components/app/daily-snapshots/sections/RecentTournaments/RecentTournamentsDropdownMenu.tsx';
import SectionHeader from '../components/SectionHeader.tsx';
import type { TournamentGroupTournament as TournamentGroupTournamentType } from '../../../../../../../types/TournamentGroup.ts';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { getDeckLeadersAndBaseKey } from '@/components/app/tournaments/TournamentMeta/tournamentMetaLib.ts';
import { useCardList } from '@/api/lists/useCardList.ts';

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
  const [winningDeckMode, setWinningDeckMode] = useState(false);
  const labelRenderer = useLabel();
  const { data: cardListData } = useCardList();

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

  // Split into majors (SQ/RQ/GC) and others (to keep table for others only)
  const majorTypes = new Set(['sq', 'rq', 'gc']);
  const majors = useMemo(() => {
    return sorted.filter(it => majorTypes.has(String(it.tournament.type).toLowerCase()));
  }, [sorted]);
  const others = useMemo(() => {
    return sorted.filter(it => !majorTypes.has(String(it.tournament.type).toLowerCase()));
  }, [sorted]);

  // Adapt majors to TournamentGroupTournament items (filter out those without a deck)
  const majorsAdapted = useMemo(() => {
    const res: TournamentGroupTournamentType[] = [];
    for (const it of majors) {
      if (!it.deck) continue; // component expects a deck
      const t = it.tournament;
      const tournamentForCard = {
        ...t,
        // Ensure date fields are Date instances for the consumer component
        date: new Date(t.date as string),
        createdAt: new Date(t.createdAt as string),
        updatedAt: new Date(t.updatedAt as string),
      } as unknown as TournamentGroupTournamentType['tournament'];
      const adapted: TournamentGroupTournamentType = {
        tournament: tournamentForCard,
        deck: it.deck,
        tournamentDeck:
          (it.winningTournamentDeck as unknown as TournamentGroupTournamentType['tournamentDeck']) ??
          ({
            tournamentId: t.id,
            deckId: it.deck.id,
            placement: 1,
            topRelativeToPlayerCount: null,
            recordWin: 0,
            recordLose: 0,
            recordDraw: 0,
            points: 0,
            meleeDecklistGuid: null,
            meleePlayerUsername: null,
          } as unknown as TournamentGroupTournamentType['tournamentDeck']),
        tournamentType:
          t as unknown as TournamentGroupTournamentType['tournament'] as unknown as TournamentGroupTournamentType['tournamentType'],
        position: 0,
      } as TournamentGroupTournamentType;
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
  }, [others, items]);

  const groups = useMemo(
    () => (payload.data.tournamentGroupExt ? [payload.data.tournamentGroupExt] : []),
    [payload.data.tournamentGroupExt],
  );

  return (
    <div className="w-full h-full flex flex-col gap-2 min-h-0">
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
                All major tournaments from last 30 days + all tournaments from last 2 weeks - hover
                any row to see the winning deck. Rows marked with{' '}
                <X className="h-4 w-4 text-red-500 inline-block" /> are not yet imported (and maybe
                won't be, depending on the data that is provided from melee.gg).
              </div>
              <div>
                Possible to turn on "Winning deck mode", which will replace tournament name with deck
                name and lead you straight to tournament decks.
              </div>
            </SectionInfoTooltip>
          </>
        }
        dropdownMenu={<RecentTournamentsDropdownMenu />}
      />
      <div className="flex justify-end items-center">
        <button
          type="button"
          className="text-[11px] text-muted-foreground hover:text-foreground underline"
          onClick={() => setWinningDeckMode(v => !v)}
          title="Toggle winning deck mode"
        >
          {winningDeckMode ? 'Show tournament names' : 'Show winning decks'}
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="text-sm text-muted-foreground">No recent tournaments</div>
      ) : (
        <div className="flex-1 max-h-[350px] xl:max-h-[700px] overflow-y-auto overflow-x-auto pr-2 -mr-2 @container/recent-tournaments">
          {/* Major tournaments section */}
          {majorsAdapted.length > 0 && (
            <div className="mb-4">
              <h4 className="text-base font-semibold mb-2">Major tournaments</h4>
              <div className="flex flex-col gap-2">
                {majorsAdapted.map(mi => (
                  <div key={mi.tournament.id} className="min-h-[150px]">
                    <TournamentGroupTournament tournamentItem={mi} compact={true} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regular recent tournaments table (majors removed) */}
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
                            <div className="flex items-center min-w-[210px]">
                              <Flag countryCode={countryCode} className="mr-2" />
                              <Link to="/tournaments/$tournamentId" params={{ tournamentId: t.id }}>
                                {winningDeckMode
                                  ? row.item.deck?.leaderCardId1
                                    ? labelRenderer(
                                        getDeckLeadersAndBaseKey(row.item.deck, cardListData),
                                        'leadersAndBase',
                                        'compact',
                                      )
                                    : '- No information -'
                                  : t.name}
                              </Link>
                            </div>
                          </td>
                          <td className="py-2 text-right">
                            {t.attendance > 0 ? (
                              <div className="items-center justify-end gap-1 hidden @[260px]/recent-tournaments:flex">
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
