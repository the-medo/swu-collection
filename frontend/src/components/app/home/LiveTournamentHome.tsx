import { cn } from '@/lib/utils.ts';
import { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, CalendarDays, Radio, RefreshCw } from 'lucide-react';
import { Link, useSearch } from '@tanstack/react-router';
import {
  useGetTournamentWeekendResources,
  useLiveTournamentSocket,
  useLiveTournamentWeekend,
} from '@/api/tournament-weekends';
import { useRole } from '@/hooks/useRole.ts';
import { useUser } from '@/hooks/useUser.ts';
import { Button } from '@/components/ui/button.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';

import {
  LiveTournamentOverviewSection,
  LiveTournamentStatusTilesSection,
  LiveTournamentWatchMode,
  PlayersAndStreamsSection,
  WeekendMetaSection,
} from './live-tournaments/sections';

const liveHomeClassName = cn(
  'live-home [--deck-row-accent:var(--live-accent)] [--live-accent:#326149] [--live-tint:#edf2e9]',
  '[--live-line:#d5e0cd] [--live-gold:#8c681f] w-full max-w-380 my-0 mx-auto px-4 pt-2 pb-10',
  'dark:[--live-accent:#b9d4a8] dark:[--live-tint:#1d2720] dark:[--live-line:#364437]',
  'dark:[--live-gold:#e4c67b]',
  '[&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-[var(--live-accent)]',
  '[&_a:focus-visible]:outline-offset-3 [&_a:focus-visible]:rounded-[3px]',
  'max-mobile:px-2 max-mobile:pt-2 max-mobile:pb-7',
  'motion-reduce:[&_.animate-spin]:animate-none',
);

function weekendDates(value: string) {
  const start = new Date(`${value}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).formatRange(start, end);
}

export default function LiveTournamentHome() {
  const user = useUser();
  const hasRole = useRole();
  const { streamId } = useSearch({ strict: false });
  const isAdmin = hasRole('admin');
  const { data, isLoading, isError, error, isFetching, refetch } = useLiveTournamentWeekend({
    refetchInterval: user ? false : 60 * 1000,
  });
  const detail = data?.data ?? null;
  useLiveTournamentSocket(detail?.weekend.id);
  const { data: pendingResourcesData } = useGetTournamentWeekendResources(
    detail?.weekend.id,
    'pending',
    isAdmin && !!detail?.weekend.id,
  );
  const pendingResources = pendingResourcesData?.data ?? [];

  const groupedTournaments = useMemo(() => {
    const tournaments = detail?.tournaments ?? [];
    return {
      running: tournaments
        .filter(entry => entry.weekendTournament.status === 'running')
        .sort((a, b) =>
          (a.weekendTournament.exactStart ?? '').localeCompare(
            b.weekendTournament.exactStart ?? '',
          ),
        ),
      finished: tournaments
        .filter(entry => entry.weekendTournament.status === 'finished')
        .sort((a, b) =>
          (b.weekendTournament.lastUpdatedAt ?? '').localeCompare(
            a.weekendTournament.lastUpdatedAt ?? '',
          ),
        ),
      upcoming: tournaments.filter(
        entry =>
          entry.weekendTournament.status === 'upcoming' ||
          entry.weekendTournament.status === 'unknown',
      ),
    };
  }, [detail]);

  if (isLoading) {
    return (
      <div className={liveHomeClassName} role="status" aria-label="Loading live weekend">
        <div
          className={cn(
            'live-weekend-layout grid grid-cols-[minmax(0,_1.9fr)_minmax(290px,_1fr)] items-start gap-6.5',
            'max-desktop:grid-cols-1',
          )}
        >
          <div className={cn('live-tournament-feed grid gap-7 min-w-0', 'max-mobile:gap-4.5')}>
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={liveHomeClassName}>
        <div
          className={cn(
            'live-empty flex items-center flex-col gap-5 py-15 px-6 border border-[color:var(--live-line)]',
            'rounded-[22px] [background:radial-gradient(ellipse_at_50%_0,_var(--live-tint),_hsl(var(--card))_70%)]',
            'text-center',
          )}
          role="alert"
        >
          <RefreshCw size={30} strokeWidth={1.4} />
          <h2 className="m-0! p-0! border-0! text-[34px]! font-medium! tracking-[-0.045em]!">
            We couldn’t load this weekend.
          </h2>
          <p className="m-0! max-w-107.5 text-[13px]! text-muted-foreground leading-[1.9]!">
            {error?.message ?? 'Please try again in a moment.'}
          </p>
          <Button variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className={liveHomeClassName}>
        <Helmet title="Live Weekend | SWUBase" />
        <section
          className={cn(
            'live-empty flex items-center flex-col gap-5 py-15 px-6 border border-[color:var(--live-line)]',
            'rounded-[22px] [background:radial-gradient(ellipse_at_50%_0,_var(--live-tint),_hsl(var(--card))_70%)]',
            'text-center',
          )}
        >
          <div
            className={cn(
              'live-empty-orbit grid place-items-center w-25 h-25 mx-0 mt-2.5 mb-3 rounded-full border',
              'border-[color:var(--live-line)] outline-1 outline-[var(--live-line)] outline-offset-12',
              'text-[color:var(--live-accent)] bg-card/60',
            )}
            aria-hidden="true"
          >
            <Radio size={36} strokeWidth={1.2} />
          </div>
          <span
            className={cn(
              'live-eyebrow inline-flex items-center gap-[7px] text-[color:var(--live-accent)] text-[10px]',
              'font-semibold tracking-[0.12em]',
            )}
          >
            LIVE WEEKEND
          </span>
          <h2 className="m-0! p-0! border-0! text-[34px]! font-medium! tracking-[-0.045em]!">
            Between weekends.
          </h2>
          <p className="m-0! max-w-107.5 text-[13px]! text-muted-foreground leading-[1.9]!">
            Every round. Every stream. Every final.
            <br />
            Come back when the next tournament weekend goes live.
          </p>
          <div className="live-empty-actions flex justify-center flex-wrap gap-2.5 mt-1">
            <Button asChild>
              <Link to="/tournaments">
                Explore tournaments <ArrowRight size={15} />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/" search={{ homeMode: 'today' }}>
                Try the daily sealed pool
              </Link>
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={liveHomeClassName} id="live-section-container">
      <Helmet title={`${detail.weekend.name} | SWUBase Live Tournaments`} />
      {streamId ? (
        <LiveTournamentWatchMode
          detail={detail}
          streamId={streamId}
          running={groupedTournaments.running}
        />
      ) : (
        <div
          className={cn(
            'live-weekend-layout grid grid-cols-[minmax(0,_1.9fr)_minmax(290px,_1fr)] items-start gap-6.5',
            'max-desktop:grid-cols-1',
          )}
        >
          <div className={cn('live-tournament-feed grid gap-7 min-w-0', 'max-mobile:gap-4.5')}>
            <header
              className={cn(
                'live-weekend-hero relative flex flex-wrap items-center justify-between gap-6 py-7 px-7.5 border',
                'border-[color:var(--live-line)] rounded-[20px]',
                '[background:radial-gradient(ellipse_at_80%_0%,_hsl(var(--card)_/_0.8),_transparent_70%),_var(--live-tint)]',
                'max-desktop:p-6',
                'max-mobile:py-3.5 max-mobile:px-4 max-mobile:gap-3 max-mobile:rounded-[14px]',
              )}
            >
              <div
                className={cn(
                  'live-weekend-intro flex-1 min-w-60',
                  'max-mobile:min-w-0 max-mobile:basis-full',
                )}
              >
                <div
                  className={cn(
                    'live-weekend-kicker flex flex-wrap items-center gap-y-3 gap-x-5 mb-3.5',
                    'max-mobile:gap-y-1 max-mobile:gap-x-3 max-mobile:mb-2',
                    'max-mobile:[&_.live-eyebrow]:text-[8px] max-mobile:[&_.live-eyebrow]:tracking-[0.06em]',
                  )}
                >
                  <span
                    className={cn(
                      'live-eyebrow inline-flex items-center gap-[7px] text-[color:var(--live-accent)] text-[10px]',
                      'font-semibold tracking-[0.12em]',
                    )}
                  >
                    <Radio size={13} /> WEEKEND COVERAGE
                  </span>
                  <span
                    className={cn(
                      'live-weekend-date inline-flex items-center gap-1.5 text-[11px] text-muted-foreground',
                      'max-mobile:text-[10px]',
                    )}
                  >
                    <CalendarDays size={13} />
                    {weekendDates(detail.weekend.date)}
                  </span>
                </div>
                <h2
                  className={cn(
                    'mx-0! mt-0! mb-2! p-0! border-0! text-[clamp(26px,_3vw,_36px)]! font-semibold! tracking-[-0.045em]!',
                    'leading-[1.1]!',
                    'max-mobile:mb-0! max-mobile:text-[25px]!',
                  )}
                >
                  {detail.weekend.name}
                </h2>
                <p
                  className={cn(
                    'm-0! text-[12px]! leading-[1.6]! text-muted-foreground',
                    'max-mobile:hidden',
                  )}
                >
                  Follow the field, find a stream, and see who takes the title.
                </p>
              </div>
              <LiveTournamentStatusTilesSection
                runningCount={detail.weekend.tournamentsRunning}
                finishedCount={detail.weekend.tournamentsFinished}
                upcomingCount={
                  detail.weekend.tournamentsUpcoming + detail.weekend.tournamentsUnknown
                }
              />
            </header>
            <LiveTournamentOverviewSection
              key={detail.weekend.id}
              running={groupedTournaments.running}
              finished={groupedTournaments.finished}
              upcoming={groupedTournaments.upcoming}
              weekendId={detail.weekend.id}
              refreshing={isFetching}
            />
            <div
              className={cn(
                'live-panel live-field-panel min-w-0 p-5.5 border border-border rounded-[18px] bg-card',
                'max-mobile:p-4.5',
              )}
            >
              <WeekendMetaSection detail={detail} />
            </div>
          </div>
          <PlayersAndStreamsSection
            detail={detail}
            pendingResourceCount={isAdmin ? pendingResources.length : 0}
          />
        </div>
      )}
    </div>
  );
}
