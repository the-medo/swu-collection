import * as React from 'react';
import { useGetTournament } from '@/api/tournaments/useGetTournament.ts';
import {
  CalendarIcon,
  MapPinIcon,
  Users,
  Trophy,
  Layers,
  CalendarRange,
  ChartPie,
  List,
} from 'lucide-react';
import { formatDate } from '@/lib/locale.ts';
import { formatDataById } from '../../../../../../types/Format.ts';
import TournamentTopBracket from '../TournamentTopBracket/TournamentTopBracket.tsx';
import { Helmet } from 'react-helmet-async';
import { BracketInfo } from '../../../../../../types/enums.ts';
import { TournamentEventInfo } from '../TournamentEventInfo.tsx';
import { TournamentAttachments } from '../attachments/TournamentAttachments.tsx';
import NoTournamentData from '../components/NoTournamentData.tsx';
import { TournamentAlbums } from '../TournamentAlbums.tsx';
import {
  workspaceStyles,
  workspaceTheme,
} from '@/components/app/global/WorkspacePage/workspaceStyles.ts';
import { PortalThemeProvider } from '@/components/ui/portal-theme';
import { cn } from '@/lib/utils.ts';

interface DetailAndBracketTabProps {
  tournamentId: string;
  displayDetail?: boolean;
  compact?: boolean;
}

const DetailAndBracketTab: React.FC<DetailAndBracketTabProps> = ({
  tournamentId,
  displayDetail = true,
  compact,
}) => {
  const { data, isFetching } = useGetTournament(tournamentId);

  const loading = isFetching;
  const tournament = data?.tournament;
  const tournamentType = data?.tournamentType;
  const meta = data?.meta;

  return (
    <PortalThemeProvider value={workspaceTheme}>
      <Helmet title="Details" />
      <div className={cn(workspaceStyles.theme, 'space-y-4')}>
        {/* Tournament info */}
        {!loading && tournament && (
          <div className="grid grid-cols-1 gap-4">
            {/* Tournament Info Table */}
            {displayDetail && (
              <div className="@container">
                <div className="grid items-stretch gap-4 @3xl:grid-cols-2 @6xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(14rem,0.85fr)]">
                  <section
                    aria-label="Tournament attributes"
                    className={cn(
                      workspaceStyles.panel,
                      'flex flex-col gap-3 p-3 @3xl:col-span-2 @6xl:col-span-1',
                    )}
                  >
                    <h2 className={cn(workspaceStyles.heading, 'flex items-center gap-2')}>
                      <List className="size-4 text-primary" aria-hidden="true" />
                      Overview
                    </h2>
                    <dl className="grid min-w-0 grid-cols-2 gap-x-5 gap-y-2">
                      {[
                        {
                          label: 'Date',
                          icon: CalendarIcon,
                          value: (
                            <>
                              {formatDate(tournament.date)}
                              {tournament.days > 1 && (
                                <span className="ml-1.5 text-xs text-muted-foreground">
                                  · {tournament.days} days
                                </span>
                              )}
                            </>
                          ),
                        },
                        {
                          label: 'Format',
                          icon: Layers,
                          value: formatDataById[tournament.format]?.name || 'Unknown',
                        },
                        {
                          label: 'Location',
                          icon: MapPinIcon,
                          value: (
                            <>
                              {tournament.location}
                              <span className="ml-1.5 text-xs text-muted-foreground">
                                ({tournament.continent})
                              </span>
                            </>
                          ),
                        },
                        {
                          label: 'Set / season',
                          icon: CalendarRange,
                          value: meta ? (
                            <>
                              {meta.set.toUpperCase()}
                              <span className="ml-1.5 text-xs text-muted-foreground">
                                Season {meta.season}
                              </span>
                            </>
                          ) : (
                            'No meta data available'
                          ),
                        },
                        {
                          label: 'Attendance',
                          icon: Users,
                          value: (
                            <>
                              {tournament.attendance} players
                              {tournament.days > 1 && (
                                <span className="ml-1.5 text-xs text-muted-foreground">
                                  ({tournament.dayTwoPlayerCount} day two)
                                </span>
                              )}
                            </>
                          ),
                        },
                        { label: 'Meta', icon: ChartPie, value: meta?.name ?? '—' },
                        {
                          label: 'Type',
                          icon: Trophy,
                          value: (
                            <>
                              {tournamentType?.name || tournament.type}
                              {tournamentType?.major === 1 && (
                                <span className="ml-1.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                  Major
                                </span>
                              )}
                            </>
                          ),
                        },
                      ].map(({ label, icon: Icon, value }) => (
                        <div key={label} className="min-w-0 space-y-0.5">
                          <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Icon className="size-3.5" aria-hidden="true" />
                            {label}
                          </dt>
                          <dd className="text-[13px] font-medium leading-snug [overflow-wrap:anywhere]">
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <div className="mt-auto empty:hidden">
                      <NoTournamentData tournamentId={tournamentId} compact />
                    </div>
                  </section>
                  <section
                    aria-label="Event information"
                    className={cn(workspaceStyles.panel, 'p-3')}
                  >
                    <TournamentEventInfo tournament={tournament} linkTitle={false} />
                  </section>
                  <TournamentAlbums tournamentId={tournamentId} tournamentName={tournament.name} />
                </div>
              </div>
            )}

            {/* Tournament Bracket */}
            <TournamentTopBracket
              tournamentId={tournamentId}
              top={(tournament.bracketInfo ?? BracketInfo.NONE) as BracketInfo}
              compact={compact}
            />
            {displayDetail && <TournamentAttachments tournamentId={tournamentId} />}
          </div>
        )}
      </div>
    </PortalThemeProvider>
  );
};

export default DetailAndBracketTab;
