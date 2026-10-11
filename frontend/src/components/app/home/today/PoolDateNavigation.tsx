import { Link } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

export function PoolDateNavigation({
  date,
  today,
  availableDates,
  isArchive,
}: {
  date: string;
  today: string;
  availableDates: string[];
  isArchive: boolean;
}) {
  const dates = [...availableDates].sort();
  const previousDate = [...dates].reverse().find(value => value < date);
  const nextDate = dates.find(value => value > date);
  return (
    <nav
      className={cn(
        'today-pool-navigation flex items-center flex-wrap gap-y-3 gap-x-4 px-1 pt-4 pb-0 text-[11px]',
        'text-muted-foreground',
        '[&_a]:inline-flex [&_a]:items-center [&_a]:gap-1.5',
        '[&_a:hover]:text-[color:var(--today-accent)] [&_a:hover]:underline',
        '[&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-[var(--today-accent)]',
        '[&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:rounded-[2px]',
      )}
      aria-label="Daily pool dates"
    >
      {previousDate ? (
        <Link
          to="/"
          search={previous => ({
            ...previous,
            homeMode: 'today',
            poolDate: previousDate,
            poolComment: undefined,
          })}
        >
          <ArrowLeft size={13} /> Previous pool
        </Link>
      ) : (
        <span />
      )}
      {isArchive && (
        <Link
          to="/"
          className="today-back-to-today ml-auto"
          search={previous => ({
            ...previous,
            homeMode: 'today',
            poolDate: undefined,
            poolComment: undefined,
          })}
        >
          Back to today
        </Link>
      )}
      {nextDate && (
        <Link
          to="/"
          search={previous => ({
            ...previous,
            homeMode: 'today',
            poolDate: nextDate === today ? undefined : nextDate,
            poolComment: undefined,
          })}
        >
          Next pool <ArrowRight size={13} />
        </Link>
      )}
    </nav>
  );
}
