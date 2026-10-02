import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { ExternalLink, Inbox, Loader2, RefreshCw } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useGetResourceSubmissions } from '@/api/tournament-weekends/useGetResourceSubmissions.ts';
import { TournamentWeekendResourceActions } from '@/components/app/home/live-tournaments/components/TournamentWeekendResourceActions.tsx';
import { getYoutubeVideoId } from '@/components/app/home/live-tournaments/liveTournamentUtils.ts';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import type { AdminResourceSubmissionListItem } from '../../../../../types/TournamentWeekend.ts';

export function ResourceSubmissionsPage() {
  const query = useGetResourceSubmissions();
  const navigate = useNavigate({ from: '/admin' });
  const { resourceStatus, resourceSearch = '' } = useSearch({ from: '/_authenticated/admin' });
  const submissions = query.data ?? [];
  const pending = submissions.filter(item => !item.resource.approved).length;
  const search = resourceSearch.trim().toLowerCase();
  const visible = submissions.filter(item => {
    if (resourceStatus === 'pending' && item.resource.approved) return false;
    if (resourceStatus === 'approved' && !item.resource.approved) return false;
    return (
      !search ||
      [
        item.resource.title,
        item.resource.description,
        item.resource.resourceUrl,
        item.resource.resourceType,
        item.resource.id,
        item.tournament.name,
        item.tournament.location,
        item.submitterName,
        ...item.weekends.map(weekend => weekend.name),
      ].some(value => value?.toLowerCase().includes(search))
    );
  });

  return (
    <div className="space-y-5">
      <Helmet title="Resource submissions | SWUBase" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Resource submissions</h2>
          <p className="text-sm text-muted-foreground">
            Review streams, videos and Melee IDs submitted across all tournament weekends.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          {query.isFetching ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 size-4" />
          )}
          Refresh
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="resource-submission-search">Search submissions</Label>
          <Input
            id="resource-submission-search"
            placeholder="Tournament, submitter, link or title…"
            maxLength={200}
            value={resourceSearch}
            onChange={event =>
              void navigate({
                replace: true,
                search: previous => ({
                  ...previous,
                  resourceSearch: event.target.value || undefined,
                }),
              })
            }
          />
        </div>
        <div className="space-y-1.5 sm:w-52">
          <Label htmlFor="resource-submission-status">Status</Label>
          <Select
            value={resourceStatus}
            onValueChange={value => {
              if (value === 'all' || value === 'pending' || value === 'approved') {
                void navigate({ search: previous => ({ ...previous, resourceStatus: value }) });
              }
            }}
          >
            <SelectTrigger id="resource-submission-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({submissions.length})</SelectItem>
              <SelectItem value="pending">Pending ({pending})</SelectItem>
              <SelectItem value="approved">Approved ({submissions.length - pending})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {query.isPending ? (
        <div
          role="status"
          className="flex items-center justify-center gap-2 py-12 text-muted-foreground"
        >
          <Loader2 className="size-5 animate-spin" />
          Loading submissions…
        </div>
      ) : query.isError ? (
        <div role="alert" className="rounded-lg border border-destructive/40 p-4 text-sm">
          <p>{query.error.message}</p>
          <Button variant="link" className="px-0" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <div className="space-y-2 rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <Inbox className="mx-auto size-8" aria-hidden="true" />
          <p>
            {submissions.length === 0
              ? 'No resource submissions yet.'
              : 'No submissions match your filters.'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground" role="status">
            {visible.length} of {submissions.length} submissions · Newest first
          </p>
          <div className="space-y-3">
            {visible.map(item => (
              <Submission key={item.resource.id} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Submission({ item }: { item: AdminResourceSubmissionListItem }) {
  const { resource, tournament, weekends, submitterName } = item;
  const resourceUrl = /^https?:\/\//i.test(resource.resourceUrl) ? resource.resourceUrl : undefined;
  const videoId = resourceUrl ? getYoutubeVideoId(resourceUrl) : null;
  const kind =
    resource.resourceType === 'melee'
      ? 'Melee ID'
      : resource.resourceType === 'stream'
        ? 'YouTube stream'
        : resource.resourceType === 'vod'
          ? 'VOD'
          : 'Video';
  const title = resource.title || `${kind} submission`;
  return (
    <article
      aria-labelledby={`submission-${resource.id}`}
      className="rounded-lg border bg-card p-4"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={resource.approved ? 'success' : 'warning'}>
              {resource.approved ? 'Approved' : 'Pending'}
            </Badge>
            <span className="text-xs text-muted-foreground">{kind}</span>
            <span className="text-xs text-muted-foreground">
              Submitted {resource.createdAt.slice(0, 19).replace('T', ' ')} UTC
            </span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            {videoId && (
              <a
                href={resourceUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`Watch ${title}`}
                className="w-40 shrink-0 overflow-hidden rounded-md border"
              >
                <img
                  src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                  alt=""
                  loading="lazy"
                  className="aspect-video w-full object-cover"
                />
              </a>
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <h3 id={`submission-${resource.id}`} className="break-words text-sm font-semibold">
                <a href={resourceUrl} target="_blank" rel="noreferrer" className="hover:underline">
                  {title} <ExternalLink className="inline size-3.5" aria-hidden="true" />
                </a>
              </h3>
              <p className="break-all text-xs text-muted-foreground">{resource.resourceUrl}</p>
              {resource.description && (
                <p className="whitespace-pre-wrap break-words text-sm">{resource.description}</p>
              )}
            </div>
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="min-w-0 space-y-1">
              <dt className="text-xs text-muted-foreground">Tournament</dt>
              <dd>
                <Link
                  to="/tournaments/$tournamentId"
                  params={{ tournamentId: tournament.id }}
                  className="break-words font-medium hover:underline"
                >
                  {tournament.name}
                </Link>
                <span className="ml-2 text-xs text-muted-foreground">{tournament.location}</span>
              </dd>
              <dd className="text-xs text-muted-foreground">
                {weekends.length
                  ? weekends.map(weekend => `${weekend.name} (${weekend.date})`).join(' · ')
                  : 'Not assigned to a weekend'}
              </dd>
            </div>
            <div className="min-w-0 space-y-1">
              <dt className="text-xs text-muted-foreground">Submitted by</dt>
              <dd className="break-words">{submitterName ?? 'Unknown or deleted user'}</dd>
            </div>
          </dl>
        </div>
        <div className="shrink-0 self-end xl:self-start">
          <TournamentWeekendResourceActions resourceId={resource.id} approved={resource.approved} />
        </div>
      </div>
    </article>
  );
}
