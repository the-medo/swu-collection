import { Link, useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import { ClipboardList, Trophy } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Route } from '@/routes/_authenticated.admin.tsx';
import { TournamentStandingsPanel } from './TournamentStandingsPanel.tsx';
import { TournamentRoundsPanel } from './TournamentRoundsPanel.tsx';

type TournamentResultsView = 'standings' | 'rounds';

interface TournamentResultsPageProps {
  tournamentId?: string;
  view: TournamentResultsView;
  round?: number;
}

export function TournamentResultsPage({ tournamentId, view, round }: TournamentResultsPageProps) {
  const navigate = useNavigate({ from: Route.fullPath });
  const handleRoundChange = useCallback(
    (nextRound: number) => {
      navigate({
        search: previous => ({
          ...previous,
          view: 'rounds',
          round: nextRound,
        }),
      });
    },
    [navigate],
  );

  if (!tournamentId) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
        <Trophy className="h-8 w-8 text-muted-foreground" />
        <div>
          <h2 className="text-lg font-semibold">Choose a tournament to manage</h2>
          <p className="text-sm text-muted-foreground">
            Open a tournament and choose <strong>Admin → Tournament results</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Tournament results</h2>
          <p className="text-sm text-muted-foreground">
            Review imported standings and round data for this tournament.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/tournaments/$tournamentId/details" params={{ tournamentId }}>
            Back to tournament
          </Link>
        </Button>
      </div>

      <Tabs
        value={view}
        onValueChange={nextView => {
          if (nextView !== 'standings' && nextView !== 'rounds') return;
          navigate({
            search: previous => ({
              ...previous,
              view: nextView,
              round: nextView === 'rounds' ? previous.round : undefined,
            }),
          });
        }}
      >
        <TabsList>
          <TabsTrigger value="standings">
            <Trophy className="h-4 w-4" />
            Standings
          </TabsTrigger>
          <TabsTrigger value="rounds">
            <ClipboardList className="h-4 w-4" />
            Rounds
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {view === 'standings' ? (
        <TournamentStandingsPanel tournamentId={tournamentId} />
      ) : (
        <TournamentRoundsPanel
          tournamentId={tournamentId}
          requestedRound={round}
          onRoundChange={handleRoundChange}
        />
      )}
    </section>
  );
}
