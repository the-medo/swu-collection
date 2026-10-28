import * as React from 'react';
import { useGetTournament } from '@/api/tournaments/useGetTournament.ts';
import TournamentTopBracket from '../TournamentTopBracket/TournamentTopBracket.tsx';
import { Helmet } from 'react-helmet-async';
import { BracketInfo } from '../../../../../../types/enums.ts';
import { TournamentOverview } from '../TournamentOverview.tsx';
import { TournamentReports } from '../TournamentReports.tsx';
import { TournamentAttachments } from '../attachments/TournamentAttachments.tsx';
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

  const loading = isFetching && !data;
  const tournament = data?.tournament;

  return (
    <PortalThemeProvider value={workspaceTheme}>
      <Helmet title="Details" />
      <div className={cn(workspaceStyles.theme, 'space-y-4')}>
        {/* Tournament info */}
        {!loading && data && tournament && (
          <div className="grid grid-cols-1 gap-4">
            {/* Tournament Info Table */}
            {displayDetail && (
              <div className="@container/tournament-details">
                <div className="grid items-stretch gap-4 @3xl/tournament-details:grid-cols-2 @6xl/tournament-details:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="grid min-w-0 @3xl/tournament-details:col-span-2 @6xl/tournament-details:col-span-1">
                    <TournamentOverview data={data} />
                  </div>
                  <TournamentAlbums tournamentId={tournamentId} tournamentName={tournament.name} />
                  <TournamentReports tournament={tournament} />
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
