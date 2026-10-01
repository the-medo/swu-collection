import { createContext, useContext, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { Day, type DayProps } from 'react-day-picker';
import { CalendarDays, ChevronLeft, ChevronRight, List, Star } from 'lucide-react';
import { Route } from '@/routes/_authenticated/tournaments/calendar';
import { useSavedTournaments } from '@/api/tournaments/useSavedTournaments.ts';
import { useCalendarWeekStart } from '@/api/user/useCalendarWeekStart.ts';
import { useHomeLocation } from '@/api/user/useHomeLocation.ts';
import { Calendar } from '@/components/ui/calendar.tsx';
import { Button } from '@/components/ui/button.tsx';
import { ButtonGroup } from '@/components/ui/button-group.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import { cn } from '@/lib/utils.ts';
import TournamentNavigation from '../TournamentNavigation/TournamentNavigation.tsx';
import { TournamentPinDetails } from '../pages/TournamentsMap/TournamentPinDetails.tsx';
import { mapPinColor } from '../pages/TournamentsMap/mapData.ts';
import { CalendarWeekStart } from './CalendarWeekStart.tsx';
import { CalendarSubscriptionButton } from './CalendarSubscription.tsx';
import { CalendarPrivacyControl } from './CalendarPrivacyControl.tsx';
import { calendarAgendaEvents, calendarEventsByDate } from './calendarData.ts';
import { TournamentAgenda } from './TournamentAgenda.tsx';
import type { SavedTournament } from '../../../../../../types/UserTournamentSave.ts';

const CalendarEvents = createContext<{
  days: Map<string, SavedTournament[]>;
  selectDay: (date: Date) => void;
}>({ days: new Map(), selectDay: () => {} });
const emptySaves: SavedTournament[] = [];
const statusLabels = { saved: 'Saved', maybe: 'Maybe', going: 'Going' };

export default function TournamentCalendar() {
  const { tcMonth, tcView } = Route.useSearch();
  const view = tcView ?? 'month';
  const navigate = useNavigate({ from: Route.fullPath });
  const query = useSavedTournaments();
  // Keep the private query observed while this page is open, including between popovers.
  useHomeLocation({ refetchOnMount: false });
  const week = useCalendarWeekStart();
  const weekStartsOn = week.data ?? 1;
  const month = startOfMonth(tcMonth ? parseISO(tcMonth) : new Date());
  const monthKey = format(month, 'yyyy-MM');
  const [selection, setSelection] = useState<{ month: string; date: Date } | null>(null);
  const selected = selection?.month === monthKey ? selection.date : month;
  const changeMonth = (date: Date) =>
    void navigate({
      search: prev => ({ ...prev, tcMonth: format(startOfMonth(date), 'yyyy-MM-dd') }),
    });
  const saves = query.data ?? emptySaves;
  const from = format(startOfWeek(month, { weekStartsOn }), 'yyyy-MM-dd');
  const to = format(endOfWeek(endOfMonth(month), { weekStartsOn }), 'yyyy-MM-dd');
  const days = calendarEventsByDate(saves, from, to);
  const selectedEvents = days.get(format(selected, 'yyyy-MM-dd')) ?? [];
  const selectDay = (date: Date) => {
    const nextMonth = format(date, 'yyyy-MM');
    setSelection({ month: nextMonth, date });
    if (nextMonth !== monthKey) changeMonth(date);
  };
  const agendaEvents = calendarAgendaEvents(
    saves,
    format(month, 'yyyy-MM-dd'),
    format(endOfMonth(month), 'yyyy-MM-dd'),
  );
  const monthHasEvents = agendaEvents.length > 0;

  return (
    <div className="min-w-0 p-2">
      <TournamentNavigation />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="mb-0">My tournament calendar</h3>
        <div className="flex flex-wrap items-center gap-3">
          <CalendarSubscriptionButton />
          {view === 'month' && <CalendarWeekStart />}
          <CalendarPrivacyControl />
        </div>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <ButtonGroup aria-label="Calendar view">
          {(['month', 'agenda'] as const).map(option => (
            <Button
              key={option}
              variant={view === option ? 'default' : 'outline'}
              aria-pressed={view === option}
              onClick={() =>
                void navigate({
                  search: prev => ({ ...prev, tcView: option === 'month' ? undefined : option }),
                })
              }
            >
              {option === 'month' ? (
                <CalendarDays className="size-4" />
              ) : (
                <List className="size-4" />
              )}
              {option === 'month' ? 'Month' : 'Agenda'}
            </Button>
          ))}
        </ButtonGroup>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous month"
            onClick={() => changeMonth(addMonths(month, -1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next month"
            onClick={() => changeMonth(addMonths(month, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const today = new Date();
              setSelection({ month: format(today, 'yyyy-MM'), date: today });
              changeMonth(today);
            }}
          >
            Today
          </Button>
        </div>
        <h4 className="mx-2 text-lg font-semibold" aria-live="polite">
          {format(month, 'MMMM yyyy')}
        </h4>
        <div className="w-44 sm:ml-auto">
          <Input
            type="month"
            aria-label="Jump to month"
            className="w-full"
            value={monthKey}
            onChange={event => {
              if (/^\d{4}-\d{2}$/.test(event.target.value))
                changeMonth(parseISO(`${event.target.value}-01`));
            }}
          />
        </div>
      </div>
      {query.isPending ? (
        <p role="status" className="py-12 text-center">
          Loading your saved tournaments…
        </p>
      ) : (
        <>
          {query.error && (
            <div role="alert" className="mb-3 text-sm text-destructive">
              {query.error.message}{' '}
              <Button variant="link" size="sm" onClick={() => void query.refetch()}>
                Retry
              </Button>
            </div>
          )}
          {view === 'agenda' ? (
            <TournamentAgenda events={agendaEvents} />
          ) : (
            <CalendarEvents.Provider value={{ days, selectDay }}>
              <Calendar
                month={month}
                onMonthChange={changeMonth}
                mode="single"
                selected={selected}
                onSelect={date => {
                  if (date) selectDay(date);
                }}
                weekStartsOn={weekStartsOn}
                showOutsideDays
                hideNavigation
                className="w-full rounded-lg border p-0! [--cell-size:6rem] md:[--cell-size:9rem]"
                classNames={{
                  root: 'w-full',
                  months: 'w-full',
                  month: 'w-full',
                  month_caption: 'hidden',
                  month_grid: 'w-full table-fixed border-collapse',
                  weekdays: 'flex w-full border-b',
                  weekday:
                    'min-w-0 flex-1 py-2 text-center text-xs font-medium text-muted-foreground',
                  week: 'flex w-full',
                  day: 'group/day relative min-w-0 flex-1 border-b border-r p-0 align-top last:border-r-0',
                  day_button: 'size-7! min-w-0! shrink-0! aspect-auto! text-xs!',
                  selected: 'bg-primary/5',
                  today: 'bg-accent/40',
                  outside: 'bg-muted/20 text-muted-foreground',
                }}
                components={{ Day: SavedCalendarDay }}
              />
            </CalendarEvents.Provider>
          )}
          {!query.error && !monthHasEvents && (
            <p className="mt-3 text-sm text-muted-foreground">
              No saved tournaments this month.{' '}
              <Link to="/tournaments/map" className="text-primary hover:underline">
                Explore the map
              </Link>{' '}
              to save events.
            </p>
          )}
          {view === 'month' && (
            <section
              className="mt-4 space-y-3 rounded-lg border p-4"
              aria-label="Selected day tournaments"
            >
              <h4 className="font-semibold">{format(selected, 'EEEE, MMMM d, yyyy')}</h4>
              {selectedEvents.length ? (
                <TournamentPinDetails tournaments={selectedEvents.map(event => event.tournament)} />
              ) : (
                <p className="text-sm text-muted-foreground">No saved tournaments on this day.</p>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function SavedCalendarDay(props: DayProps) {
  const { days, selectDay } = useContext(CalendarEvents);
  const events = days.get(format(props.day.date, 'yyyy-MM-dd')) ?? [];
  return (
    <Day {...props}>
      <div className="flex min-h-(--cell-size) min-w-0 flex-col gap-1 p-1">
        {props.children}
        <div className="min-w-0 space-y-1">
          {events.slice(0, 3).map(event => (
            <Popover key={event.tournamentId}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label={`${event.tournament.name} — ${statusLabels[event.status]}`}
                  title={`${event.tournament.name} — ${statusLabels[event.status]}`}
                  className={cn(
                    'flex w-full min-w-0 items-center gap-1 rounded-sm px-1 py-1 text-left text-[10px] font-medium leading-tight focus-visible:outline-2 focus-visible:outline-ring sm:text-xs',
                    event.tournament.format === 3 ? 'text-white' : 'text-neutral-900',
                  )}
                  style={{ backgroundColor: mapPinColor(event.tournament.format, 0, 12) }}
                >
                  <Star className="hidden size-3 shrink-0 sm:block" />
                  <span className="truncate">{event.tournament.name}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-80 max-w-[calc(100vw-2rem)] p-3"
                aria-label={event.tournament.name}
              >
                <TournamentPinDetails tournaments={[event.tournament]} />
              </PopoverContent>
            </Popover>
          ))}
          {events.length > 3 && (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => selectDay(props.day.date)}
            >
              +{events.length - 3} more
            </button>
          )}
        </div>
      </div>
    </Day>
  );
}
