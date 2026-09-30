import { addDays, format, parseISO } from 'date-fns';
import type { SavedTournament } from '../../../../../../types/UserTournamentSave.ts';

// Include every day of a multi-day tournament, including adjacent-month cells.
export function calendarEventsByDate(events: SavedTournament[], from: string, to: string) {
  const result = new Map<string, SavedTournament[]>();
  for (const event of events) {
    const start = event.tournament.date;
    const end = format(
      addDays(parseISO(start), Math.max(1, event.tournament.days) - 1),
      'yyyy-MM-dd',
    );
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
