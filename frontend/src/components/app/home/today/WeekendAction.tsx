import { cn } from '@/lib/utils.ts';
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { addDays, format, parseISO } from 'date-fns';
import { ArrowRight, Play, Radio } from 'lucide-react';
import { useLiveTournamentWeekend } from '@/api/tournament-weekends/useLiveTournamentWeekend.ts';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { getYoutubeVideoId } from '../live-tournaments/liveTournamentUtils.ts';
import { useCurrentWeekend } from '../useCurrentWeekend.ts';

function CoverageThumbnail({ videoId }: { videoId: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={cn(
        'today-weekend-thumbnail relative flex h-20 flex-col items-center justify-center gap-1.5 bg-[#163426]',
        'text-[#fff] text-[9px]',
        '[&_>_svg]:relative',
        '[&_>_span]:relative',
      )}
    >
      {!failed && (
        <img
          src={`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute w-full h-full object-cover opacity-45"
        />
      )}
      <Play size={20} fill="currentColor" aria-hidden="true" />
      <span>Watch coverage</span>
    </span>
  );
}

export default function WeekendAction() {
  const weekendDate = useCurrentWeekend();
  const query = useLiveTournamentWeekend({
    enabled: !!weekendDate,
    refetchInterval: weekendDate ? 60_000 : false,
  });
  if (!weekendDate) return null;

  const detail = query.data?.data?.weekend.date === weekendDate ? query.data.data : null;
  const weekend = detail?.weekend;
  const total = detail?.tournaments.length ?? 0;
  const statusPriority = { running: 0, upcoming: 1, unknown: 2, finished: 3 };
  const coverage = detail?.resources
    .flatMap(resource => {
      const videoId = getYoutubeVideoId(resource.resourceUrl);
      const tournament = detail.tournaments.find(t => t.tournament.id === resource.tournamentId);
      return resource.approved && resource.resourceType === 'stream' && videoId && tournament
        ? [{ resource, videoId, tournament }]
        : [];
    })
    .sort(
      (a, b) =>
        statusPriority[a.tournament.weekendTournament.status] -
        statusPriority[b.tournament.weekendTournament.status],
    )[0];
  const saturday = parseISO(weekendDate);

  return (
    <section
      className={cn(
        'today-weekend [--weekend-ink:#267144] min-w-0 py-5 px-6 border border-[#a5cdb1] rounded-[20px]',
        '[background:linear-gradient(115deg,_#edf7ef,_hsl(var(--card)))]',
        'dark:[--weekend-ink:#97dfaf] dark:border-[#3d6b4c]',
        'dark:[background:linear-gradient(115deg,_#1c3025,_hsl(var(--card)))]',
        '[&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-[var(--weekend-ink)]',
        '[&_a:focus-visible]:outline-offset-4',
        '[&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-[var(--weekend-ink)]',
        '[&_button:focus-visible]:outline-offset-4',
        'max-phone:py-4.5 max-phone:px-4',
      )}
      aria-labelledby="today-weekend-title"
    >
      <header
        className={cn(
          'today-weekend-heading flex flex-wrap items-center justify-between gap-y-1.5 gap-x-3 mb-3.5',
          '[&_svg]:text-[color:var(--weekend-ink)]',
          '[&_>_span]:text-muted-foreground [&_>_span]:text-[10px] [&_>_span]:whitespace-nowrap',
        )}
      >
        <h2
          id="today-weekend-title"
          className="flex items-center gap-2 m-0! p-0! border-0! text-[20px]! font-semibold! tracking-[-0.035em]!"
        >
          <Radio size={18} aria-hidden="true" /> Weekend action
        </h2>
        <span>
          {format(saturday, 'MMM d')}–{format(addDays(saturday, 1), 'MMM d')}
        </span>
      </header>
      <div className={cn('today-weekend-body flex items-center gap-4', 'max-phone:gap-3')}>
        <div
          className={cn(
            'today-weekend-copy flex-1 min-w-0',
            '[&_.today-weekend-summary]:text-foreground [&_.today-weekend-summary]:font-medium',
            '[&_button:hover]:underline',
            '[&_button]:text-[color:var(--weekend-ink)] [&_button]:underline [&_button]:underline-offset-2',
          )}
        >
          {query.isPending ? (
            <div role="status" aria-label="Loading weekend action">
              <Skeleton className="mb-2 h-4 w-40 max-w-full" />
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
          ) : query.isError ? (
            <p className="m-0! text-muted-foreground text-[12px]! leading-[1.65]!">
              Weekend updates couldn’t be loaded.{' '}
              <button type="button" onClick={() => void query.refetch()}>
                Try again
              </button>
            </p>
          ) : total > 0 && weekend ? (
            <>
              <p className="today-weekend-summary m-0! text-muted-foreground text-[12px]! leading-[1.65]!">
                {total} {total === 1 ? 'tournament' : 'tournaments'} this weekend.
              </p>
              <ul
                className={cn(
                  'today-weekend-stats flex flex-wrap gap-y-[5px] gap-x-3 mx-0 mt-[7px] mb-0 p-0 list-none',
                  'text-muted-foreground text-[11px]',
                )}
                aria-label="Weekend tournament status"
              >
                {weekend.tournamentsRunning > 0 && (
                  <li
                    className={cn(
                      'today-weekend-running inline-flex items-center gap-[5px] text-[color:var(--weekend-ink)]',
                      'font-semibold',
                      '[&_span]:w-[5px] [&_span]:h-[5px] [&_span]:rounded-full [&_span]:bg-current',
                    )}
                  >
                    <span aria-hidden="true" />
                    {weekend.tournamentsRunning} live now
                  </li>
                )}
                {weekend.tournamentsUpcoming > 0 && <li>{weekend.tournamentsUpcoming} upcoming</li>}
                {weekend.tournamentsFinished > 0 && <li>{weekend.tournamentsFinished} finished</li>}
                {weekend.tournamentsUnknown > 0 && (
                  <li>{weekend.tournamentsUnknown} awaiting updates</li>
                )}
              </ul>
            </>
          ) : (
            <p className="m-0! text-muted-foreground text-[12px]! leading-[1.65]!">
              Coverage for this weekend is on its way. Check Live Weekend for the latest events and
              streams.
            </p>
          )}
          <Link
            to="/"
            search={previous => ({
              ...previous,
              homeMode: 'live',
              poolDate: undefined,
              streamId: undefined,
            })}
            className={cn(
              'today-weekend-link inline-flex items-center gap-[7px] mt-3.5 text-[color:var(--weekend-ink)]',
              'text-[11px] font-semibold',
              'hover:underline',
            )}
          >
            Go to Live Weekend <ArrowRight size={14} />
          </Link>
        </div>
        {!query.isError && coverage && (
          <Link
            to="/"
            search={previous => ({
              ...previous,
              homeMode: 'live',
              poolDate: undefined,
              streamId: coverage.resource.id,
            })}
            aria-label={`Watch ${coverage.tournament.tournament.name || coverage.resource.title || 'tournament'} coverage`}
            className={cn(
              'today-weekend-video flex-[0_0_112px] rounded-[9px] overflow-hidden',
              'max-phone:basis-22',
            )}
          >
            <CoverageThumbnail key={coverage.videoId} videoId={coverage.videoId} />
          </Link>
        )}
      </div>
    </section>
  );
}
