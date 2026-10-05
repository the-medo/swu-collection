import { getRouteApi, Link } from '@tanstack/react-router';
import { BookOpen, CalendarDays, ChartSpline, ChevronRight, Settings, Users } from 'lucide-react';
import { useJoinRequests } from '@/api/teams';
import { cn } from '@/lib/utils.ts';
import { TeamSidebar } from './TeamSidebar.tsx';
import type { Team } from '../../../../../../server/db/schema/team.ts';

const route = getRouteApi('/teams/$teamId');
const sections = [
  { value: 'decks', label: 'Decks', icon: BookOpen },
  { value: 'members', label: 'Members', icon: Users },
  { value: 'events', label: 'Team events', icon: CalendarDays },
  { value: 'settings', label: 'Settings', icon: Settings },
] as const;

export function TeamNavigation({
  team,
  isOwner,
  isStatistics,
}: {
  team: Team;
  isOwner: boolean;
  isStatistics: boolean;
}) {
  const { teamId } = route.useParams();
  const { teamTab = 'decks' } = route.useSearch();
  // Keep statistics filters in the URL across team sections; the statistics route validates them on return.
  const activeSection = teamTab === 'settings' && !isOwner ? 'decks' : teamTab;
  const { data: requests } = useJoinRequests(isOwner ? team.id : undefined);
  const requestsCount = requests?.filter(request => request.status === 'pending').length ?? 0;

  return (
    <TeamSidebar
      team={team}
      isMember
      navigation={
        <nav
          aria-label="Team sections"
          className="flex flex-col gap-1 border-border @[761px]/main-body:border-b @[761px]/main-body:pb-4"
        >
          {sections
            .filter(section => section.value !== 'settings' || isOwner)
            .map(section => (
              <Link
                key={section.value}
                to="/teams/$teamId"
                params={{ teamId }}
                search={previous => ({ ...previous, teamTab: section.value })}
                resetScroll={false}
                aria-current={!isStatistics && activeSection === section.value ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  !isStatistics &&
                    activeSection === section.value &&
                    'bg-primary/10 text-foreground',
                )}
              >
                <section.icon className="size-4 shrink-0" aria-hidden="true" />
                {section.label}
                {section.value === 'members' && isOwner && requestsCount > 0 && (
                  <span className="ml-auto flex min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                    <span className="sr-only">Pending join requests: </span>
                    {requestsCount}
                  </span>
                )}
              </Link>
            ))}
        </nav>
      }
    >
      <Link
        to="/teams/$teamId/statistics/dashboard"
        params={{ teamId }}
        search={previous => ({ ...previous, teamTab: undefined })}
        resetScroll={false}
        aria-current={isStatistics ? 'page' : undefined}
        className={cn(
          'group flex min-w-0 items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isStatistics && 'border-primary/40 bg-primary/10',
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ChartSpline className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 text-sm font-semibold">Team statistics</span>
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground"
          aria-hidden="true"
        />
      </Link>
    </TeamSidebar>
  );
}
