import { addDays, addMonths, differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { TournamentMapRange } from '../../types/TournamentMap.ts';

export const dateString = (date: Date) => format(date, 'yyyy-MM-dd');
export const shiftDate = (date: string, days: number) => dateString(addDays(parseISO(date), days));

export function fourMonthWindow(from: string): TournamentMapRange {
  return { from, to: dateString(addDays(addMonths(parseISO(from), 4), -1)) };
}

export function rangeDates({ from, to }: TournamentMapRange) {
  return Array.from(
    { length: differenceInCalendarDays(parseISO(to), parseISO(from)) + 1 },
    (_, index) => shiftDate(from, index),
  );
}

export function mapWeekIndex(date: string, start: string) {
  return Math.floor(differenceInCalendarDays(parseISO(date), parseISO(start)) / 7);
}
