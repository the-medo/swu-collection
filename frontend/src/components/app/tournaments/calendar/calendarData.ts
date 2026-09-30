import { addDays, format, parseISO } from 'date-fns';
import type { SavedTournament } from '../../../../../../types/UserTournamentSave.ts';

export function calendarEventEnd(event: SavedTournament) {
  return format(
    addDays(parseISO(event.tournament.date), Math.max(1, event.tournament.days) - 1),
    'yyyy-MM-dd',
  );
}

// One entry per tournament, including events which started in the previous month.
export function calendarAgendaEvents(events: SavedTournament[], from: string, to: string) {
  return events
    .filter(event => event.tournament.date <= to && calendarEventEnd(event) >= from)
    .sort(
      (a, b) =>
        a.tournament.date.localeCompare(b.tournament.date) ||
        a.tournament.name.localeCompare(b.tournament.name) ||
        a.tournamentId.localeCompare(b.tournamentId),
    );
}

// Include every day of a multi-day tournament, including adjacent-month cells.
export function calendarEventsByDate(events: SavedTournament[], from: string, to: string) {
  const result = new Map<string, SavedTournament[]>();
  for (const event of events) {
    const start = event.tournament.date;
    const end = calendarEventEnd(event);
    if (end < from || start > to) continue;
    const last = end < to ? end : to;
    for (
      let date = start > from ? start : from;
      date <= last;
      date = format(addDays(parseISO(date), 1), 'yyyy-MM-dd')
    ) {
      const day = result.get(date) ?? [];
      day.push(event);
      result.set(date, day);
    }
  }
  return result;
}
