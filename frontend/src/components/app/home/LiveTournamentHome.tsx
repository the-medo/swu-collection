import { type ReactNode, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Loader2 } from 'lucide-react';
import { useLiveTournamentWeekend } from '@/api/tournament-weekends';
import { useUser } from '@/hooks/useUser.ts';
import GridSection, {
  type GridCardSizing,
  type SectionCardSizing,
} from '@/components/app/global/GridSection/GridSection.tsx';
import GridSectionContent from '@/components/app/global/GridSection/GridSectionContent.tsx';
import {
  LiveTournamentOverviewSection,
  LiveTournamentStatusTilesSection,
  PlayersAndStreamsSection,
  WeekendMetaSection,
} from './live-tournaments/sections';

type LiveSectionKey = 'status-tiles' | 'overview' | 'players-streams' | 'meta';

const gridArea = (
  rowFrom: number,
  rowTo: number,
  colFrom: number,
  colTo: number,
): GridCardSizing => ({
  row: { from: rowFrom, to: rowTo },
  col: { from: colFrom, to: colTo },
});

const liveSectionSizing: Record<LiveSectionKey, SectionCardSizing> = {
  'status-tiles': {
    1: gridArea(1, 1, 1, 1),
    2: gridArea(1, 1, 1, 2),
    3: gridArea(1, 1, 1, 2),
    4: gridArea(1, 1, 1, 2),
  },
  overview: {
    1: gridArea(2, 2, 1, 1),
    2: gridArea(2, 2, 1, 2),
    3: gridArea(2, 3, 1, 2),
    4: gridArea(2, 3, 1, 2),
  },
  'players-streams': {
    1: gridArea(3, 3, 1, 1),
    2: gridArea(3, 3, 1, 2),
    3: gridArea(1, 2, 3, 3),
    4: gridArea(1, 2, 3, 3),
  },
  meta: {
    1: gridArea(4, 4, 1, 1),
    2: gridArea(4, 4, 1, 2),
    3: gridArea(3, 3, 3, 3),
    4: gridArea(3, 3, 3, 3),
  },
};

function LiveGridSection({
  section,
  children,
  framed = true,
}: {
  section: LiveSectionKey;
  children: ReactNode;
  framed?: boolean;
}) {
  return (
    <GridSection id={`live-${section}`} sizing={liveSectionSizing[section]}>
      {framed ? <GridSectionContent>{children}</GridSectionContent> : children}
    </GridSection>
  );
}

export default function LiveTournamentHome() {
  const user = useUser();
  const { data, isLoading, isError, error, isFetching } = useLiveTournamentWeekend({
    refetchInterval: user ? false : 60 * 1000,
  });
  const detail = data?.data ?? null;

  const groupedTournaments = useMemo(() => {
    const tournaments = detail?.tournaments ?? [];
    return {
      running: tournaments.filter(entry => entry.weekendTournament.status === 'running'),
      finished: tournaments.filter(entry => entry.weekendTournament.status === 'finished'),
      upcoming: tournaments.filter(
        entry =>
          entry.weekendTournament.status === 'upcoming' ||
          entry.weekendTournament.status === 'unknown',
      ),
    };
  }, [detail]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading live weekend...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 text-sm text-destructive">
        {error?.message ?? 'Failed to load live tournament weekend.'}
      </div>
    );
  }

  if (!detail) {
    return (
      <>
        <Helmet title="Live Tournaments | SWUBase" />
        <div className="space-y-3 p-2">
          <h1 className="text-2xl font-semibold">Live Tournaments</h1>
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No live tournament weekend is active right now. Snapshot mode is still available.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet title={`${detail.weekend.name} | SWUBase Live Tournaments`} />
      <div className="w-full mx-auto px-2 py-2" id="live-section-container">
        {isFetching && (
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Refreshing live data...
          </div>
        )}

        <div className="grid grid-flow-dense auto-rows-auto grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <LiveGridSection section="status-tiles" framed={false}>
            <LiveTournamentStatusTilesSection
              runningCount={detail.weekend.tournamentsRunning}
              finishedCount={detail.weekend.tournamentsFinished}
              upcomingCount={detail.weekend.tournamentsUpcoming + detail.weekend.tournamentsUnknown}
            />
          </LiveGridSection>

          <LiveGridSection section="overview">
            <LiveTournamentOverviewSection
              running={groupedTournaments.running}
              finished={groupedTournaments.finished}
              upcoming={groupedTournaments.upcoming}
              weekendId={detail.weekend.id}
            />
          </LiveGridSection>

          <LiveGridSection section="players-streams">
            <PlayersAndStreamsSection detail={detail} />
          </LiveGridSection>

          <LiveGridSection section="meta">
            <WeekendMetaSection detail={detail} />
          </LiveGridSection>
        </div>
      </div>
    </>
  );
}
