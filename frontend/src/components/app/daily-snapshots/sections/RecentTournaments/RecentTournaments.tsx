import * as React from 'react';
import { useMemo } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { DailySnapshotRow } from '@/api/daily-snapshot';
import type {
  DailySnapshotSectionData,
  SectionRecentTournaments,
  SectionRecentTournamentsItem,
} from '../../../../../../../types/DailySnapshots.ts';
import Flag from '@/components/app/global/Flag.tsx';
import { Users, X } from 'lucide-react';
import { CountryCode } from '../../../../../../../server/db/lists.ts';
import { SectionInfoTooltip } from '../components/SectionInfoTooltip.tsx';
import TournamentGroupTournament from '@/components/app/tournaments/TournamentGroup/TournamentGroupTournament.tsx';
import RecentTournamentsDropdownMenu from '@/components/app/daily-snapshots/sections/RecentTournaments/RecentTournamentsDropdownMenu.tsx';
import SectionHeader from '../components/SectionHeader.tsx';
import type { TournamentGroupTournament as TournamentGroupTournamentType } from '../../../../../../../types/TournamentGroup.ts';
import DeckAvatar from '@/components/app/global/DeckAvatar/DeckAvatar.tsx';
import { useMatchHeightToElementId } from '@/hooks/useMatchHeightToElementId.tsx';
import { cn } from '@/lib/utils';

// Split into majors (SQ/RQ/GC) and others (to keep table for others only)
const majorTypes = new Set(['sq', 'rq', 'gc']);
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
  const navigate = useNavigate();
  const { maTournamentId } = useSearch({ strict: false });
  const items = payload.data.tournaments ?? EMPTY_ITEMS;
  const scrollRef = useMatchHeightToElementId('s-recent-tournaments', true, h => `${h - 120}px`);

  // Row click handler: decides between selecting in-section vs opening detail page
  const handleRowClick = React.useCallback(
    (e: React.MouseEvent<HTMLTableRowElement, MouseEvent>, tournamentId: string) => {
      // Middle-click (auxiliary button) or explicit Ctrl/Meta click should always open new tab
      const isAuxClick = e.button === 1;
      const isModifier = e.ctrlKey || e.metaKey;

      const section = document.getElementById('section-container');
      const width = section?.getBoundingClientRect().width ?? window.innerWidth;

      const openTournamentInNewTab = () => {
        const url = `/tournaments/${tournamentId}`;
        window.open(url, '_blank', 'noopener');
      };

      if (isAuxClick || isModifier) {
        // Prevent default to avoid accidental text selection or other side-effects
        e.preventDefault();
        openTournamentInNewTab();
        return;
      }

      if (width < 1000) {
        e.preventDefault();
        openTournamentInNewTab();
      } else {
        // Keep current in-section navigation
        navigate({
          to: '.',
          search: prev => ({ ...prev, maDeckId: undefined, maTournamentId: tournamentId }),
        });
      }
    },
    [navigate],
  );

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
  }, [others]);

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
                Possible to turn on "Winning deck mode", which will replace tournament name with
                deck name and lead you straight to tournament decks.
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

                const name = t.name.replace('PQ - ', '').split(', ')[0];

                const isSelected = String(maTournamentId ?? '') === String(t.id);

                return (
                  <tr
                    key={t.id}
                    className={cn(
                      'border-b border-gray-100 dark:border-gray-800 cursor-pointer',
                      isSelected ? 'bg-primary/10 hover:bg-primary/20' : 'hover:bg-muted/50',
                    )}
                    onMouseDown={e => handleRowClick(e, t.id)}
                  >
                    <td className="py-1 px-1 w-[100px]">
                      <DeckAvatar deck={row.item.deck} size="50" />
                    </td>
                    <td className="py-1 px-1">
                      <div className="flex flex-col gap-2 min-w-[130px]">
                        <span className="font-semibold">{name}</span>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Flag countryCode={countryCode} className="w-5 h-3" />
                            {countryCode && <span>{countryCode}</span>}
                            {notImported ? (
                              <X className="h-4 w-4 text-red-500 inline-block" />
                            ) : null}
                          </div>
                          {t.attendance > 0 ? (
                            <div className="items-center justify-end gap-1 flex">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span>{t.attendance}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                  </tr>
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
