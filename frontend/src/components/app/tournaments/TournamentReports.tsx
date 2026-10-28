import { Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { ArrowUpRight, BookOpen, PenLine } from 'lucide-react';
import { creatorKeys, hubApi, useHubQuery } from '@/api/creators';
import { Button } from '@/components/ui/button.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { workspaceStyles } from '@/components/app/global/WorkspacePage/workspaceStyles.ts';
import { UserDisplay } from '@/components/app/global/UserDisplay.tsx';
import { cn } from '@/lib/utils.ts';
import type { TournamentStringDate } from '../../../../../types/Tournament.ts';
import { TournamentReportArt } from './TournamentCommunityArt.tsx';
import { CreateTournamentReportButton } from './CreateTournamentReportButton.tsx';

export function TournamentReports({ tournament }: { tournament: TournamentStringDate }) {
  const upcoming = tournament.date.slice(0, 10) > format(new Date(), 'yyyy-MM-dd');
  const filter = {
    entityType: 'tournament' as const,
    entityId: tournament.id,
    tags: 'medium:article',
  };
  const request = { ...filter, limit: 3 };
  const query = useHubQuery(creatorKeys.discovery(request), () => hubApi.discover(request));
  const articles = query.data?.items ?? [];
  return (
    <section
      aria-label="Tournament reports & articles"
      className={cn(workspaceStyles.panel, 'flex min-w-0 flex-col overflow-hidden p-4')}
    >
      <header className="flex items-start justify-between gap-2">
        <h2 className={cn(workspaceStyles.heading, 'flex min-w-0 items-start gap-2')}>
          <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>Tournament reports & articles</span>
        </h2>
        <Link
          to="/tournaments/$tournamentId/community-content"
          params={{ tournamentId: tournament.id }}
          aria-label="View all tournament reports and articles"
          className="flex shrink-0 items-center gap-1 rounded-sm text-[11px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          View all <ArrowUpRight className="size-3" aria-hidden="true" />
        </Link>
      </header>
      {query.isPending && (
        <div role="status" className="my-4 flex-1 space-y-3">
          <span className="sr-only">Loading tournament reports…</span>
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      )}
      {query.isError && (
        <div role="alert" className="my-5 flex-1 space-y-2 text-xs">
          <p className="leading-relaxed! text-destructive">Could not load tournament reports.</p>
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            Retry reports
          </Button>
        </div>
      )}
      {query.isSuccess && !articles.length && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-5 text-center">
          <TournamentReportArt />
          <div className="space-y-2">
            <h3 className={cn(workspaceStyles.heading, 'text-[length:1rem]!')}>
              {upcoming ? 'The story starts here.' : 'Your run. Your story.'}
            </h3>
            <p className="mx-auto max-w-64 text-xs leading-relaxed! text-muted-foreground">
              {upcoming
                ? 'Going to this event? Start with your deck choices and preparation, then add the matches and moments afterward.'
                : 'The deck you brought, the match you’ll remember, what you learned. Be the first to tell your story from this event.'}
            </p>
          </div>
        </div>
      )}
      {!!articles.length && (
        <div className="my-4 flex-1 space-y-3">
          <div className="divide-y divide-border/60">
            {articles.map(article => (
              <article key={article.id} className="flex min-w-0 items-start gap-3 py-3 first:pt-0">
                <Link
                  to="/content/$creationId"
                  params={{ creationId: article.id }}
                  tabIndex={-1}
                  aria-hidden="true"
                  className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-primary/5 text-primary"
                >
                  {article.document.coverUrl ? (
                    <img
                      src={article.document.coverUrl}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="size-full object-cover"
                    />
                  ) : (
                    <PenLine className="size-4" aria-hidden="true" />
                  )}
                </Link>
                <div className="min-w-0 flex-1 space-y-1">
                  <Link
                    to="/content/$creationId"
                    params={{ creationId: article.id }}
                    className="group flex min-w-0 items-start gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span className="line-clamp-2 min-w-0 flex-1 text-xs font-semibold leading-relaxed group-hover:text-primary [overflow-wrap:anywhere]">
                      {article.document.title}
                    </span>
                    <ArrowUpRight
                      className="mt-1 size-3 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </Link>
                  {article.creator ? (
                    <Link
                      to="/creators/$slug"
                      params={{ slug: article.creator.slug }}
                      className="inline-flex max-w-full rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <UserDisplay
                        user={{
                          displayName: article.creator.name,
                          image: article.creator.avatarUrl,
                        }}
                        className="py-0 text-[11px] [&>span:last-child]:truncate"
                      />
                    </Link>
                  ) : (
                    <UserDisplay
                      user={{
                        id: article.author?.id,
                        displayName: article.author?.name ?? 'Community member',
                        image: article.author?.avatarUrl,
                      }}
                      className="py-0 text-[11px] text-muted-foreground [&>span:last-child]:truncate"
                    />
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
      <div className="mt-auto space-y-2 pt-2">
        <p className="text-center text-[10px] leading-relaxed! text-muted-foreground">
          Start your story. Publish when you’re ready.
        </p>
        <CreateTournamentReportButton tournament={tournament} />
      </div>
    </section>
  );
}
