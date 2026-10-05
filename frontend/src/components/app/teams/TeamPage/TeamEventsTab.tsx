import { Link } from '@tanstack/react-router';
import { Check, CircleHelp, MapPin, Star } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useTeamEvents } from '@/api/teams/useTeamEvents.ts';
import { useToday } from '@/hooks/useToday.ts';
import { useUser } from '@/hooks/useUser.ts';
import { cn } from '@/lib/utils.ts';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import { calendarEventEnd } from '../../tournaments/calendar/calendarData.ts';
import { locationText } from '../../tournaments/pages/TournamentsMap/mapData.ts';
import { savedTournamentMarkers } from '../../tournaments/pages/TournamentsMap/savedTournamentMarkers.ts';
import type { TournamentSaveStatus } from '../../../../../../types/UserTournamentSave.ts';

import { TournamentSaveControls } from '../../tournaments/TournamentSaveControls.tsx';

const icons = { going: Check, maybe: CircleHelp, saved: Star };
const attendeeColors = {
  going:
    'border-green-500/20 bg-green-500/10 text-green-800 hover:bg-green-500/20 dark:text-green-300',
  maybe:
    'border-amber-500/20 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 dark:text-amber-300',
  saved: 'border-blue-500/20 bg-blue-500/10 text-blue-800 hover:bg-blue-500/20 dark:text-blue-300',
} satisfies Record<TournamentSaveStatus, string>;

export function TeamEventsTab({ teamId }: { teamId: string }) {
  const user = useUser();
  const query = useTeamEvents(teamId, useToday());
  if (!user)
    return (
      <div className="space-y-2">
        <p className="text-sm">Sign in to see your team&apos;s events.</p>
        <SignIn />
      </div>
    );
  if (query.isPending) return <p role="status">Loading team events…</p>;
  if (query.isError)
    return (
      <div role="alert">
        {query.error.message}{' '}
        <Button variant="link" onClick={() => void query.refetch()}>
          Retry
        </Button>
      </div>
    );
  return (
    <div className="@container space-y-2">
      <p className="text-xs leading-snug! text-muted-foreground">
        Upcoming and ongoing tournaments from your own saves and teammates who share their calendars
        with your team. Your private saves are visible only to you.
      </p>
      {!query.data.length ? (
        <p className="text-sm text-muted-foreground">No upcoming team events.</p>
      ) : (
        <ul aria-label="Team events" className="space-y-2">
          {query.data.map(event => {
            const { tournament } = event;
            const end = calendarEventEnd(event);
            return (
              <li
                key={tournament.id}
                className="grid min-w-0 items-center gap-2 rounded-lg border bg-card p-3 @[40rem]:grid-cols-[minmax(0,1fr)_13rem] @[40rem]:gap-4"
              >
                <div className="grid min-w-0 items-center gap-x-4 gap-y-1.5 @[32rem]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                  <Link
                    to="/tournaments/$tournamentId"
                    params={{ tournamentId: tournament.id }}
                    className="min-w-0 break-words text-sm font-semibold leading-snug text-primary hover:underline"
                  >
                    {tournament.name}
                  </Link>
                  <p className="m-0 flex min-w-0 items-start gap-1 text-xs leading-snug! text-muted-foreground">
                    <MapPin className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 break-words">
                      {locationText(tournament) || 'Location to be announced'}
                    </span>
                  </p>
                  <p className="m-0 text-xs leading-snug!">
                    <time dateTime={tournament.date}>
                      {format(parseISO(tournament.date), 'EEE, MMM d, yyyy')}
                    </time>
                    {end !== tournament.date && (
                      <>
                        {' '}
                        – <time dateTime={end}>{format(parseISO(end), 'MMM d, yyyy')}</time>
                      </>
                    )}
                  </p>
                  <ul
                    aria-label={`Teammates at ${tournament.name}`}
                    className="flex min-w-0 flex-wrap gap-1"
                  >
                    {event.members.map(member => {
                      const Icon = icons[member.status];
                      return (
                        <li key={member.userId} className="max-w-full">
                          <Link
                            to="/users/$userId"
                            params={{ userId: member.userId }}
                            search={{ userTab: 'calendar' }}
                            className={cn(
                              'flex min-w-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs transition-colors',
                              attendeeColors[member.status],
                            )}
                            title={`${member.displayName} — ${savedTournamentMarkers[member.status].label}`}
                          >
                            <Avatar className="size-4 shrink-0">
                              <AvatarImage src={member.image ?? undefined} alt="" />
                              <AvatarFallback>{member.displayName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="min-w-0 break-words">{member.displayName}</span>
                            <Icon className="size-3 shrink-0" aria-hidden="true" />
                            <span className="sr-only">
                              {savedTournamentMarkers[member.status].label}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="justify-self-end">
                  <TournamentSaveControls tournamentId={tournament.id} className="mt-0" />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
