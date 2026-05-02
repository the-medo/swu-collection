import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { LiveSectionHeader } from '../components';
import type { LiveTournamentWeekendDetail } from '../liveTournamentTypes.ts';
import { getYoutubeEmbedUrl } from '../liveTournamentUtils.ts';
import { TournamentWeekendPendingResourceReviewDialog } from '@/components/app/home/live-tournaments/components';
import { TournamentWeekendResourceSubmissionDialog } from '@/components/app/home/live-tournaments/components';
import { TournamentWeekendStreamCard } from '../components/TournamentWeekendStreamCard.tsx';
import { TournamentWeekendStreamsDialog } from '../components/TournamentWeekendStreamsDialog.tsx';

const INLINE_STREAM_LIMIT = 3;

function getStreamSortPriority(
  entry: LiveTournamentWeekendDetail['tournaments'][number] | undefined,
) {
  switch (entry?.weekendTournament.status) {
    case 'running':
      return 0;
    case 'finished':
      return 2;
    default:
      return 1;
  }
}

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
        {streamEntries.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No approved stream links yet.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3">
              {visibleResources.map(({ resource, tournament }) => (
                <TournamentWeekendStreamCard
                  key={resource.id}
                  resource={resource}
                  tournament={tournament}
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
