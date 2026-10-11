import { cn } from '@/lib/utils.ts';
import { useId, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import { formatPoolDate } from './poolDateUtils.ts';

// Calendar cells use local dates; challenge keys always represent a UTC day.
// Construct local noon rather than parsing an ISO string as a UTC instant.
function calendarDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function PoolDatePicker({
  date,
  today,
  availableDates,
}: {
  date: string;
  today: string;
  availableDates: string[];
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const navigate = useNavigate();
  const dates = [...availableDates].sort();
  const available = new Set(dates);
  const first = dates[0];
  const last = dates[dates.length - 1];
  const month = first && last ? (date < first ? first : date > last ? last : date) : date;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'today-pool-date',
            '[&:not(:disabled):hover]:bg-card',
            'focus-visible:outline-2 focus-visible:outline-[var(--today-accent)] focus-visible:outline-offset-3',
            'inline-flex items-center gap-[7px] py-[9px] px-2.5 border border-[color:var(--today-panel-border)]',
            'rounded-[7px] bg-card/65 text-[12px] font-semibold text-[color:var(--today-accent)] whitespace-nowrap',
            '[&_svg]:shrink-0',
            '@max-[430.01px]:justify-self-start',
          )}
          aria-label={`Choose pool date, ${formatPoolDate(date)}`}
          disabled={dates.length === 0}
        >
          <CalendarDays size={14} aria-hidden="true" />
          <time dateTime={date}>{formatPoolDate(date)}</time>
          <ChevronDown size={12} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="today-pool-calendar w-auto p-2"
        align="start"
        aria-labelledby={titleId}
      >
        <h3 id={titleId} className="px-2 pt-1 text-sm font-semibold m-0! text-[14px]!">
          Choose a daily pool
        </h3>
        <p className="px-2 pb-1 text-xs text-muted-foreground mx-0! mt-1! mb-0! max-w-57.5 text-[11px]!">
          Highlighted dates have a pool to explore.
        </p>
        <Calendar
          mode="single"
          required
          autoFocus
          captionLayout="dropdown"
          selected={available.has(date) ? calendarDate(date) : undefined}
          defaultMonth={calendarDate(month)}
          today={calendarDate(today)}
          startMonth={first ? calendarDate(first) : undefined}
          endMonth={last ? calendarDate(last) : undefined}
          disabled={day => !available.has(dateKey(day))}
          modifiers={{ available: day => available.has(dateKey(day)) }}
          modifiersClassNames={{
            available:
              'today-calendar-available [&_button:not([data-selected-single=true])]:shadow-[inset_0_0_0_1px_hsl(var(--border))] [&_button:not([data-selected-single=true])]:font-semibold',
          }}
          onSelect={day => {
            const selected = dateKey(day);
            setOpen(false);
            void navigate({
              to: '/',
              search: previous => ({
                ...previous,
                homeMode: 'today',
                poolDate: selected === today ? undefined : selected,
                poolComment: undefined,
              }),
            });
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
