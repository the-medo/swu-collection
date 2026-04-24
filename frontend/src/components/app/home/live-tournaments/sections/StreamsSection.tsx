import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { LiveSectionHeader } from '../components';
import type { LiveTournamentWeekendDetail } from '../liveTournamentTypes.ts';
import { getYoutubeEmbedUrl } from '../liveTournamentUtils.ts';
import { TournamentWeekendPendingResourceReviewDialog } from '../components/TournamentWeekendPendingResourceReviewDialog.tsx';
import { TournamentWeekendResourceSubmissionDialog } from '../components/TournamentWeekendResourceSubmissionDialog.tsx';
import { TournamentWeekendStreamCard } from '../components/TournamentWeekendStreamCard.tsx';
import { TournamentWeekendStreamsDialog } from '../components/TournamentWeekendStreamsDialog.tsx';

const INLINE_STREAM_LIMIT = 3;

export function StreamsSection({
  detail,
  pendingResourceCount = 0,
}: {
  detail: LiveTournamentWeekendDetail;
  pendingResourceCount?: number;
}) {
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [allStreamsDialogOpen, setAllStreamsDialogOpen] = useState(false);
  const tournamentsById = new Map(detail.tournaments.map(entry => [entry.tournament.id, entry]));
  const streamResources = useMemo(
    () =>
      detail.resources.filter(
        resource =>
          resource.resourceType === 'stream' && getYoutubeEmbedUrl(resource.resourceUrl) !== null,
      ),
    [detail.resources],
  );
  const preparedResources = streamResources.filter(resource => {
    const status = tournamentsById.get(resource.tournamentId)?.weekendTournament.status;
    return status === 'running' || status === 'upcoming' || status === 'unknown';
  });
  const resources = preparedResources.length > 0 ? preparedResources : streamResources;
  const streamEntries = resources.map(resource => ({
    resource,
    tournamentName: tournamentsById.get(resource.tournamentId)?.tournament.name,
  }));
  const visibleResources = streamEntries.slice(0, INLINE_STREAM_LIMIT);
  const hasMoreStreams = streamEntries.length > INLINE_STREAM_LIMIT;

  return (
    <>
      <section className="flex w-full flex-col gap-3">
        <LiveSectionHeader
          title="Streams"
          action={
            <div className="flex items-center gap-2">
              {pendingResourceCount > 0 ? (
                <Button type="button" size="xs" onClick={() => setReviewDialogOpen(true)}>
                  Pending ({pendingResourceCount})
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="iconSmall"
                className="h-7 w-7 rounded-md"
                aria-label="Submit stream or Melee ID"
                onClick={() => setSubmissionDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          }
        />
        {resources.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No approved stream links yet.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3">
              {visibleResources.map(({ resource, tournamentName }) => (
                <TournamentWeekendStreamCard
                  key={resource.id}
                  resource={resource}
                  tournamentName={tournamentName}
                />
              ))}
            </div>
            {hasMoreStreams ? (
              <Button type="button" variant="outline" onClick={() => setAllStreamsDialogOpen(true)}>
                View all
              </Button>
            ) : null}
          </div>
        )}
      </section>

      <TournamentWeekendResourceSubmissionDialog
        open={submissionDialogOpen}
        onOpenChange={setSubmissionDialogOpen}
        weekendId={detail.weekend.id}
        tournaments={detail.tournaments}
      />
      <TournamentWeekendPendingResourceReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        weekendId={detail.weekend.id}
      />
      <TournamentWeekendStreamsDialog
        open={allStreamsDialogOpen}
        onOpenChange={setAllStreamsDialogOpen}
        resources={streamEntries}
      />
    </>
  );
}
