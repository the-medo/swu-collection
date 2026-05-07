import { useMemo, useState } from 'react';
import { ExternalLink, RefreshCw, X } from 'lucide-react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
import { LiveSectionHeader, TournamentCard, TournamentInfoRow, YouTubeEmbed } from '../components';
import { LiveStatusBadge } from '../components/LiveStatusBadge.tsx';
import { TournamentWeekendStreamsDialog } from '../components/TournamentWeekendStreamsDialog.tsx';
import type {
  LiveTournamentWeekendDetail,
  LiveTournamentWeekendTournamentEntry,
} from '../liveTournamentTypes.ts';
import { getMeleeUrl, getYoutubeEmbedUrl } from '../liveTournamentUtils.ts';
import { WatchedPlayersSection } from './WatchedPlayersSection.tsx';

function getStreamSortPriority(entry: LiveTournamentWeekendTournamentEntry | undefined) {
  switch (entry?.weekendTournament.status) {
    case 'running':
      return 0;
    case 'finished':
      return 2;
    default:
      return 1;
  }
}

function WatchModeInProgressSection({
  running,
  detail,
}: {
  running: LiveTournamentWeekendTournamentEntry[];
  detail: LiveTournamentWeekendDetail;
}) {
  return (
    <section className="flex min-h-0 flex-col gap-3">
      <LiveSectionHeader title="In Progress" count={running.length} />

      {running.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Nothing here right now.
        </div>
      ) : (
        <div className="grid gap-3">
          {running.map(entry => (
            <TournamentCard
              key={entry.tournament.id}
              entry={entry}
              weekendId={detail.weekend.id}
              weekendTournaments={detail.tournaments}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function WatchModeHeader({
  resourceTitle,
  tournament,
  onSwitchStream,
  onClose,
}: {
  resourceTitle: string;
  tournament?: LiveTournamentWeekendTournamentEntry;
  onSwitchStream: () => void;
  onClose: () => void;
}) {
  const meleeUrl = tournament ? getMeleeUrl(tournament.tournament.meleeId) : null;

  return (
    <div className="rounded-md border bg-background px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="mb-0! text-xl font-semibold leading-tight">
              {tournament?.tournament.name ?? resourceTitle}
            </h2>
            {tournament && (
              <>
                <Link
                  to="/tournaments/$tournamentId"
                  params={{ tournamentId: tournament.tournament.id }}
                  target="_blank"
                  aria-label="Open tournament detail"
                >
                  <ExternalLink className="size-4" />
                </Link>
                <LiveStatusBadge status={tournament.weekendTournament.status} />
              </>
            )}
          </div>
          {tournament ? (
            <TournamentInfoRow entry={tournament} meleeUrl={meleeUrl} showProgress />
          ) : (
            <div className="text-xs text-muted-foreground">{resourceTitle}</div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onSwitchStream}>
            <RefreshCw className="h-4 w-4" />
            Switch stream
          </Button>
          <Button
            type="button"
            variant="outline"
            size="iconSmall"
            className="h-8 w-8 rounded-md"
            aria-label="Close watch mode"
            title="Close watch mode"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function LiveTournamentWatchMode({
  detail,
  streamId,
  running,
}: {
  detail: LiveTournamentWeekendDetail;
  streamId: string;
  running: LiveTournamentWeekendTournamentEntry[];
}) {
  const navigate = useNavigate();
  const [switchDialogOpen, setSwitchDialogOpen] = useState(false);
  const streamEntries = useMemo(() => {
    const tournamentsById = new Map(detail.tournaments.map(entry => [entry.tournament.id, entry]));

    return detail.resources
      .filter(
        resource =>
          resource.resourceType === 'stream' && getYoutubeEmbedUrl(resource.resourceUrl) !== null,
      )
      .map((resource, index) => ({
        resource,
        tournament: tournamentsById.get(resource.tournamentId),
        index,
      }))
      .sort(
        (a, b) =>
          getStreamSortPriority(a.tournament) - getStreamSortPriority(b.tournament) ||
          a.index - b.index,
      );
  }, [detail.resources, detail.tournaments]);
  const selectedResource = detail.resources.find(
    resource => resource.id === streamId && resource.resourceType === 'stream',
  );
  const selectedTournament = selectedResource
    ? detail.tournaments.find(entry => entry.tournament.id === selectedResource.tournamentId)
    : undefined;
  const resourceTitle = selectedResource?.title?.trim() || 'Tournament stream';
  const hasVideo = selectedResource
    ? getYoutubeEmbedUrl(selectedResource.resourceUrl) !== null
    : false;

  const closeWatchMode = () => {
    navigate({
      to: '.',
      search: previous => ({
        ...previous,
        streamId: undefined,
      }),
    });
  };

  return (
    <div className="grid min-h-0 w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_350px]">
      <section className="min-w-0 space-y-3">
        <WatchModeHeader
          resourceTitle={resourceTitle}
          tournament={selectedTournament}
          onSwitchStream={() => setSwitchDialogOpen(true)}
          onClose={closeWatchMode}
        />

        {selectedResource && hasVideo ? (
          <YouTubeEmbed url={selectedResource.resourceUrl} title={resourceTitle} />
        ) : (
          <div className="flex min-h-[22rem] items-center justify-center rounded-md border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            Stream video is unavailable.
          </div>
        )}
      </section>

      <aside className="grid content-start gap-4 lg:sticky lg:top-2 lg:max-h-[calc(100vh-1rem)] lg:overflow-y-auto lg:pr-1">
        <WatchedPlayersSection detail={detail} />
        <div className="border-t pt-4">
          <WatchModeInProgressSection running={running} detail={detail} />
        </div>
      </aside>

      <TournamentWeekendStreamsDialog
        open={switchDialogOpen}
        onOpenChange={setSwitchDialogOpen}
        resources={streamEntries}
        selectedStreamId={streamId}
        onSelectStream={nextStreamId => {
          navigate({
            to: '.',
            search: previous => ({
              ...previous,
              homeMode: 'live',
              streamId: nextStreamId,
            }),
          });
        }}
      />
    </div>
  );
}
