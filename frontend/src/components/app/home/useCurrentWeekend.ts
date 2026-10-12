import { format, isWeekend, parseISO, startOfWeek } from 'date-fns';
import { useToday } from '@/hooks/useToday.ts';

// Weekend records are keyed by Saturday; follow the viewer's local calendar.
// useToday also updates at midnight and when a sleeping tab becomes active.
export function useCurrentWeekend() {
  const today = parseISO(useToday());
  return isWeekend(today) ? format(startOfWeek(today, { weekStartsOn: 6 }), 'yyyy-MM-dd') : null;
}
