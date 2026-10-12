import { Link } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Layers3, RefreshCw } from 'lucide-react';
import { useDailySealedPool } from '@/api/card-pools/useDailySealedPool.ts';
import { Button } from '@/components/ui/button.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { cn } from '@/lib/utils.ts';
import { getDailySealedDate } from '../../../../../../shared/types/dailySealed.ts';
import ContinueDecks from './ContinueDecks.tsx';
import CommunityBrewing from './CommunityBrewing.tsx';
import RecentDiscussions from './RecentDiscussions.tsx';
import WeekendAction from './WeekendAction.tsx';
import { DailyPoolPanel } from './DailyPoolPanel.tsx';
import { PoolDatePicker } from './PoolDatePicker.tsx';
import { PoolDateNavigation } from './PoolDateNavigation.tsx';
import { formatPoolDate } from './poolDateUtils.ts';

export default function TodayHome({
  date,
  discussionOpen = false,
  focusCommentId,
}: {
  date?: string;
  discussionOpen?: boolean;
  focusCommentId?: string;
}) {
  const query = useDailySealedPool(date);
  const data = query.data;
  // The API owns "today" on both the current pool and archive pages.
  const today = data?.today ?? getDailySealedDate();
  const requestedDate = data?.date ?? date ?? today;
  const selectedDate = data?.pool?.date ?? requestedDate;
  const isToday = requestedDate === today;
  const availableDates = data?.availableDates ?? [];
  const isFallback = !!data?.pool && selectedDate !== requestedDate;

  return (
    <div
      className={cn(
        'today-home [--deck-row-accent:var(--today-accent)] [--today-accent:#326149] [--today-panel:#eef2e9]',
        '[--today-panel-border:#d9e1d2] w-full max-w-380 my-0 mx-auto px-4 pt-4 pb-10',
        'dark:[--today-accent:#b9d4a8] dark:[--today-panel:#1d2720] dark:[--today-panel-border:#364437]',
        'max-mobile:px-2',
        'max-phone:pt-2 max-phone:pb-6',
      )}
    >
      <Helmet title={`Daily Sealed Pool · ${selectedDate} | SWUBase`} />
      <div
        className={cn(
          'today-columns grid grid-cols-2 items-stretch gap-14',
          'max-tablet:grid-cols-1 max-tablet:gap-7',
        )}
      >
        <div className={cn('today-pool-column min-w-0 pt-16', 'max-phone:pt-12.5')}>
          {query.isPending ? (
            <div
              role="status"
              aria-label="Loading daily pool"
              className="today-loading py-10 px-6 border border-border rounded-[20px] bg-card"
            >
              <Skeleton className="h-44 rounded-xl" />
              <Skeleton className="mt-10 h-8 w-3/4" />
              <Skeleton className="mt-6 h-44 rounded-xl" />
            </div>
          ) : query.isError ? (
            <div
              role="alert"
              className={cn(
                'today-page-state py-10 px-6 border border-border rounded-[20px] bg-card flex flex-col items-center',
                'gap-5 text-center',
              )}
            >
              <RefreshCw size={30} />
              <h2 className="m-0! p-0! border-0! text-[24px]! tracking-[-0.03em]!">
                This pool couldn’t be loaded.
              </h2>
              <p className="m-0! text-[13px]! leading-[1.7]! text-muted-foreground">
                Please try again in a moment.
              </p>
              <Button onClick={() => void query.refetch()}>Try again</Button>
            </div>
          ) : data?.pool ? (
            <DailyPoolPanel
              key={data.pool.id}
              pool={data.pool}
              date={selectedDate}
              dateParam={date}
              today={today}
              availableDates={availableDates}
              isFallback={isFallback}
              onRefresh={() => void query.refetch()}
              discussionOpen={discussionOpen}
              focusCommentId={focusCommentId}
            />
          ) : (
            <div
              className={cn(
                'today-page-state py-10 px-6 border border-border rounded-[20px] bg-card flex flex-col items-center',
                'gap-5 text-center',
              )}
            >
              <Layers3 size={32} strokeWidth={1.3} />
              <h2 className="m-0! p-0! border-0! text-[24px]! tracking-[-0.03em]!">
                {isToday ? 'Today’s pool is on its way.' : 'No pool for this day.'}
              </h2>
              <p className="m-0! text-[13px]! leading-[1.7]! text-muted-foreground">
                {isToday
                  ? 'Come back for eight packs and a fresh deckbuilding challenge.'
                  : `No daily pool is available for ${formatPoolDate(selectedDate)}. Try another day.`}
              </p>
              {availableDates.length > 0 && (
                <PoolDatePicker date={selectedDate} today={today} availableDates={availableDates} />
              )}
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild>
                  <Link to="/limited/public">
                    Explore public pools <ArrowRight size={15} />
                  </Link>
                </Button>
                <Button variant="outline" onClick={() => void query.refetch()}>
                  Check again
                </Button>
              </div>
            </div>
          )}
          <PoolDateNavigation
            date={selectedDate}
            today={today}
            availableDates={availableDates}
            isArchive={!isToday}
          />
        </div>
        <div className="today-community-column flex flex-col gap-6 min-w-0">
          <WeekendAction />
          <CommunityBrewing />
          <RecentDiscussions />
          <ContinueDecks />
        </div>
      </div>
    </div>
  );
}
