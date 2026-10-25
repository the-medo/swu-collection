import { browseStyles } from '@/components/app/global/BrowsePage/browseStyles';
import { cn } from '@/lib/utils';
import { Helmet } from 'react-helmet-async';
import { Link } from '@tanstack/react-router';
import {
  ArrowUpRight,
  Plus,
  Users,
  Lock,
  LinkIcon,
  ShieldCheck,
  ChartSpline,
  Target,
  Earth,
} from 'lucide-react';
import { useTeams } from '@/api/teams';
import { useUser } from '@/hooks/useUser.ts';
import { Button } from '@/components/ui/button.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import NewTeamDialog from '@/components/app/dialogs/NewTeamDialog.tsx';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { BrowseHeader, BrowsePage } from '@/components/app/global/BrowsePage/BrowsePage.tsx';
import type { UserTeam } from '../../../../../../server/routes/teams/get.ts';

const MAX_TEAMS = 2;

function TeamCard({ team }: { team: UserTeam }) {
  const teamUrl = `/teams/${team.shortcut ?? team.id}`;
  const PrivacyIcon = team.privacy === 'private' ? Lock : Earth;
  return (
    <article
      className={cn(
        'flex flex-col gap-5 transition-colors hover:border-[var(--browse-border)]',
        browseStyles.panel,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <Avatar className="size-16 rounded-2xl">
          <AvatarImage src={team.logoUrl ?? undefined} alt="" className="object-cover" />
          <AvatarFallback className="rounded-2xl bg-[var(--browse-soft)] text-[var(--browse-accent)]">
            <Users className="size-7" />
          </AvatarFallback>
        </Avatar>
        <span className="flex items-center gap-1.5 rounded-full bg-[var(--browse-soft)] px-3 py-1 text-xs capitalize text-[var(--browse-accent)]">
          <PrivacyIcon className="size-3" />
          {team.privacy}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <Link
          to={teamUrl}
          className="text-xl font-semibold tracking-tight [overflow-wrap:anywhere] hover:underline"
        >
          {team.name}
        </Link>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {team.description || 'Your shared space for tournament preparation and team statistics.'}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <Link
          to={`${teamUrl}/statistics`}
          className="inline-flex items-center gap-2 text-sm text-[var(--browse-accent)] hover:underline"
        >
          <ChartSpline className="size-4" />
          Statistics
        </Link>
        <Button asChild variant="outline" size="sm">
          <Link to={teamUrl}>
            Open team <ArrowUpRight className="size-4" />
          </Link>
        </Button>
      </div>
    </article>
  );
}

export default function TeamsPage() {
  const user = useUser();
  const { data: teams = [], isPending, isError, refetch } = useTeams();
  const canCreate = !!user && !isPending && !isError && teams.length < MAX_TEAMS;
  return (
    <>
      <Helmet title="Teams | SWUBase" />
      <BrowsePage>
        <BrowseHeader
          hero
          eyebrow="Teams"
          title="Find your edge, together."
          icon={Users}
          description="Bring your testing group together. Share results, understand your matchups, and prepare for your next tournament."
        >
          {!user ? (
            <SignIn forceTextButton buttonText="Sign in to get started" />
          ) : (
            canCreate && (
              <NewTeamDialog
                trigger={
                  <Button>
                    <Plus className="size-4" />
                    Create a team
                  </Button>
                }
              />
            )
          )}
        </BrowseHeader>
        {user && (
          <section aria-labelledby="your-teams-title">
            <div className={browseStyles.sectionHeading}>
              <h2 id="your-teams-title">Your teams</h2>
              {!isPending && !isError && (
                <span className="text-xs text-muted-foreground">
                  {teams.length} of {MAX_TEAMS} team spaces
                </span>
              )}
            </div>
            {isPending ? (
              <div className="grid gap-4 sm:grid-cols-2" role="status" aria-label="Loading teams">
                <Skeleton className="h-64 rounded-[20px]" />
                <Skeleton className="h-64 rounded-[20px]" />
              </div>
            ) : isError ? (
              <div
                role="alert"
                className={cn('flex flex-wrap items-center gap-4', browseStyles.panel)}
              >
                Your teams could not be loaded.
                <Button variant="outline" onClick={() => void refetch()}>
                  Try again
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {teams.map(team => (
                  <TeamCard key={team.id} team={team} />
                ))}
                {canCreate && (
                  <NewTeamDialog
                    trigger={
                      <button
                        type="button"
                        className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed border-[var(--browse-border)] bg-[var(--browse-soft)] p-6 text-center transition-colors hover:border-[var(--browse-accent)] focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className={browseStyles.icon}>
                          <Plus className="size-6" />
                        </span>
                        <span className="text-lg font-semibold text-[var(--browse-accent)]">
                          {teams.length ? 'Create another team' : 'Create your first team'}
                        </span>
                        <span className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                          A home for your testing group, local players, or tournament crew.
                        </span>
                      </button>
                    }
                  />
                )}
              </div>
            )}
          </section>
        )}
        <section className="grid gap-4 md:grid-cols-3" aria-label="What you can do with a team">
          {[
            {
              icon: ChartSpline,
              title: 'See the bigger picture',
              text: 'Combine your members’ game results to explore win rates, matchups, and card performance.',
            },
            {
              icon: Target,
              title: 'Prepare with purpose',
              text: 'Use your shared statistics to compare decks and focus your next testing session.',
            },
            {
              icon: ShieldCheck,
              title: 'Keep your circle close',
              text: 'Teams start private. Share an invite link and approve the players who join.',
            },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className={cn('flex flex-col gap-4', browseStyles.panel)}>
              <span className={browseStyles.icon}>
                <Icon className="size-5" />
              </span>
              <h2 className="m-0! border-0! p-0! text-lg! font-semibold! tracking-tight">
                {title}
              </h2>
              <p className="m-0 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>
        <aside className="flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--browse-border)] bg-[var(--browse-soft)] px-6 py-5">
          <LinkIcon className="size-5 shrink-0 text-[var(--browse-accent)]" />
          <div className="min-w-0 flex-1">
            <p className="m-0 font-medium">Already have a team in mind?</p>
            <p className="m-0 mt-1 text-sm leading-relaxed text-muted-foreground">
              Ask a member for an invite link. Open it to request to join; an owner will approve
              your request.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">Up to {MAX_TEAMS} teams per player</span>
        </aside>
      </BrowsePage>
    </>
  );
}
