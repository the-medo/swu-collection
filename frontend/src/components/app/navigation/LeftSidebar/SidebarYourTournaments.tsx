import type { PropsWithChildren } from 'react';
import { useToday } from '@/hooks/useToday.ts';
import { Link } from '@tanstack/react-router';
import { addDays, format, parseISO } from 'date-fns';
import { CalendarDays, Check, CircleHelp, Star } from 'lucide-react';
import { useSidebarSettings } from '@/api/user/useSidebarSettings.ts';
import { useSavedTournaments } from '@/api/tournaments/useSavedTournaments.ts';
import { Button } from '@/components/ui/button.tsx';
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar.tsx';
import { calendarAgendaEvents, calendarEventEnd } from '../../tournaments/calendar/calendarData.ts';
import { savedTournamentMarkers } from '../../tournaments/pages/TournamentsMap/savedTournamentMarkers.ts';

const statusIcons = { going: Check, maybe: CircleHelp, saved: Star };

export function SidebarYourTournaments() {
  const settings = useSidebarSettings();
  if (settings.isPending || settings.data?.left_sidebar_my_tournaments === false) return null;
  if (settings.isError)
    return (
      <SidebarTournamentSection>
        <div role="alert" className="px-2 text-xs text-destructive">
          Could not load sidebar settings.{' '}
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => void settings.refetch()}
          >
            Retry
          </Button>
        </div>
      </SidebarTournamentSection>
    );
  return (
    <SidebarTournamentEvents
      daysBefore={settings.data.left_sidebar_my_tournaments_days_before}
      daysAfter={settings.data.left_sidebar_my_tournaments_days_after}
    />
  );
}

function SidebarTournamentSection({ children }: PropsWithChildren) {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const expanded = isMobile || state === 'expanded';
  return (
    <SidebarGroup role="group" aria-label="Your tournaments in sidebar" className="py-0">
      <SidebarGroupLabel>Your tournaments</SidebarGroupLabel>
      <SidebarGroupAction asChild title="Your calendar" className="top-1.5">
        <Link to="/tournaments/calendar" onClick={() => setOpenMobile(false)}>
          <CalendarDays />
          <span className="sr-only">Your calendar</span>
        </Link>
      </SidebarGroupAction>
      <SidebarGroupContent>
        {!expanded ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Your tournaments">
                <Link to="/tournaments/calendar">
                  <CalendarDays />
                  <span>Your tournaments</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : (
          children
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function SidebarTournamentEvents({
  daysBefore,
  daysAfter,
}: {
  daysBefore: number;
  daysAfter: number;
}) {
  const query = useSavedTournaments();
  const today = useToday();
  const { setOpenMobile } = useSidebar();
  const from = format(addDays(parseISO(today), -daysBefore), 'yyyy-MM-dd');
  const to = format(addDays(parseISO(today), daysAfter), 'yyyy-MM-dd');
  const events = calendarAgendaEvents(query.data ?? [], from, to);
  if (query.isPending || (!query.isError && events.length === 0)) return null;
  return (
    <SidebarTournamentSection>
      {query.isError && (
        <div role="alert" className="px-2 text-xs text-destructive">
          Could not load your tournaments.{' '}
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => void query.refetch()}
          >
            Retry
          </Button>
        </div>
      )}
      <SidebarMenu>
        {events.map(event => {
          const { tournament, status } = event;
          const Icon = statusIcons[status];
          const label = savedTournamentMarkers[status].label;
          const end = calendarEventEnd(event);
          const dateLabel = `${format(parseISO(tournament.date), 'MMM d, yyyy')}${
            end !== tournament.date ? ` – ${format(parseISO(end), 'MMM d, yyyy')}` : ''
          }`;
          const description = `${tournament.name} — ${label} — ${dateLabel}`;
          return (
            <SidebarMenuItem key={event.tournamentId}>
              <SidebarMenuButton asChild size="sm" title={description}>
                <Link
                  to="/tournaments/$tournamentId"
                  params={{ tournamentId: event.tournamentId }}
                  onClick={() => setOpenMobile(false)}
                  className="[&.active]:font-bold"
                  aria-label={description}
                >
                  <Icon aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{tournament.name}</span>
                  <time
                    dateTime={tournament.date}
                    className="shrink-0 whitespace-nowrap text-[11px] tabular-nums text-muted-foreground"
                  >
                    {format(parseISO(tournament.date), 'MMM d')}
                  </time>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarTournamentSection>
  );
}
