import { useSharedCalendar } from '@/api/tournaments/useSharedCalendar.ts';
import { Button } from '@/components/ui/button.tsx';
import { TournamentAgenda } from '../../tournaments/calendar/TournamentAgenda.tsx';
import { useUser } from '@/hooks/useUser.ts';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { useToday } from '@/hooks/useToday.ts';
import { calendarEventEnd } from '../../tournaments/calendar/calendarData.ts';

export function UserCalendarTab({ userId }: { userId: string }) {
  const user = useUser();
  const query = useSharedCalendar(userId);
  const today = useToday();
  if (query.isPending) return <p role="status">Loading calendar…</p>;
  if (query.isError) {
    const status = 'status' in query.error ? query.error.status : undefined;
    // The API also returns 404 for private/unlisted calendars to avoid revealing access details.
    // Signing in may grant team access to the profile that is already displayed here.
    const accessDenied = status === 401 || status === 403 || status === 404;
    return (
      <div role={accessDenied ? 'status' : 'alert'} className="space-y-3">
        <h3>{accessDenied ? 'Calendar not shared' : 'Calendar unavailable'}</h3>
        <p className={accessDenied ? 'text-sm text-muted-foreground' : undefined}>
          {accessDenied ? 'This calendar is not shared with you.' : query.error.message}
        </p>
        {accessDenied && !user && (
          <div className="space-y-2">
            <p className="text-sm">Sign in if this calendar is shared with your team.</p>
            <SignIn />
          </div>
        )}
        {!accessDenied && (
          <Button variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        )}
      </div>
    );
  }
  const upcoming = query.data.events.filter(event => calendarEventEnd(event) >= today);
  const past = query.data.events.filter(event => calendarEventEnd(event) < today);
  const showSaveControls = user?.id === userId;
  return (
    <div className="min-w-0 space-y-4">
      <h3>Upcoming tournaments</h3>
      {upcoming.length ? (
        <TournamentAgenda events={upcoming} showSaveControls={showSaveControls} />
      ) : (
        <p className="text-sm text-muted-foreground">No upcoming saved tournaments.</p>
      )}
      {past.length > 0 && (
        <details className="space-y-3">
          <summary className="cursor-pointer text-sm font-medium">
            Past tournaments ({past.length})
          </summary>
          <TournamentAgenda events={past} showSaveControls={showSaveControls} />
        </details>
      )}
    </div>
  );
}
