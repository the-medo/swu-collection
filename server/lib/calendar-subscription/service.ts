import { asc, eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { userCalendarSubscription as subscription } from '../../db/schema/user_calendar_subscription.ts';
import { userTournamentSave } from '../../db/schema/user_tournament_save.ts';
import { tournament } from '../../db/schema/tournament.ts';
import { format } from '../../db/schema/format.ts';
import type { CalendarSubscription } from '../../../types/CalendarSubscription.ts';
import { calendarOrigin, calendarToken, calendarTokenId } from './token.ts';
import { tournamentCalendar, type CalendarEvent } from './ical.ts';

export function createCalendarSubscriptionService(
  config: { origin?: string; secret?: string } = {},
) {
  const state = (id?: string): CalendarSubscription => ({
    enabled: !!id,
    url: id
      ? `${calendarOrigin(config.origin)}/api/calendar/${calendarToken(id, config.secret)}.ics`
      : null,
  });
  return {
    async get(userId: string) {
      const [row] = await db
        .select({ id: subscription.id })
        .from(subscription)
        .where(eq(subscription.userId, userId));
      return state(row?.id);
    },
    async enable(userId: string, regenerate = false) {
      const id = crypto.randomUUID();
      state(id); // Validate configuration before making a URL active.
      return db.transaction(async tx => {
        const insert = tx.insert(subscription).values({ userId, id });
        if (regenerate)
          await insert.onConflictDoUpdate({
            target: subscription.userId,
            set: { id, updatedAt: sql`now()` },
          });
        else await insert.onConflictDoNothing({ target: subscription.userId });
        const [row] = await tx
          .select({ id: subscription.id })
          .from(subscription)
          .where(eq(subscription.userId, userId));
        return state(row?.id);
      });
    },
    async disable(userId: string) {
      await db.delete(subscription).where(eq(subscription.userId, userId));
      return state();
    },
    async feed(token: string) {
      const id = calendarTokenId(token, config.secret);
      if (!id) return null;
      // One snapshot authorizes the URL and reads only this owner's saved events.
      // No private attachment, home-location, or saved-event JSON is selected.
      const rows = await db
        .select({
          event: {
            id: tournament.id,
            name: tournament.name,
            date: sql<string>`${tournament.date}::text`,
            days: tournament.days,
            location: tournament.location,
            additionalInfo: tournament.additionalInfo,
            meleeId: tournament.meleeId,
            formatName: format.name,
            status: userTournamentSave.status,
            updatedAt:
              sql<Date>`greatest(${userTournamentSave.updatedAt}, ${tournament.updatedAt})`.mapWith(
                tournament.updatedAt,
              ),
          },
        })
        .from(subscription)
        .leftJoin(userTournamentSave, eq(userTournamentSave.userId, subscription.userId))
        .leftJoin(tournament, eq(tournament.id, userTournamentSave.tournamentId))
        .leftJoin(format, eq(format.id, tournament.format))
        .where(eq(subscription.id, id))
        .orderBy(asc(tournament.date), asc(tournament.id));
      if (!rows.length) return null;
      const events: CalendarEvent[] = [];
      for (const { event } of rows) {
        const { id, name, days, location, additionalInfo, status, ...rest } = event;
        if (id === null) continue; // A valid subscription with no saved tournaments.
        if (
          name === null ||
          days === null ||
          location === null ||
          additionalInfo === null ||
          status === null
        )
          throw new Error('Incomplete calendar event.');
        events.push({ ...rest, id, name, days, location, additionalInfo, status });
      }
      return tournamentCalendar(events, calendarOrigin(config.origin));
    },
  };
}
export const calendarSubscriptionService = createCalendarSubscriptionService();
