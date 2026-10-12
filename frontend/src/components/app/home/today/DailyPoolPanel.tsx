import { lazy, Suspense } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, ChevronDown, Clock3, MessageCircle } from 'lucide-react';
import { useDailySealedBuild } from '@/api/card-pools/useDailySealedBuild.ts';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';
import { CompactDeckRow } from '../CompactDeckRow.tsx';
import { setInfo } from '../../../../../../lib/swu-resources/set-info.ts';
import type { DailySealedPool } from '../../../../../../shared/types/dailySealed.ts';
import { LeaderHand } from './LeaderHand.tsx';
import { NewestBuilds } from './NewestBuilds.tsx';
import { PoolDatePicker } from './PoolDatePicker.tsx';
import { PoolLink } from './PoolLink.tsx';
import { formatPoolDate } from './poolDateUtils.ts';

const todayBuildButtonClassName = cn(
  'today-build-button h-10 py-0 px-[17px] rounded-[7px] bg-[var(--today-accent)]',
  'text-[color:var(--today-panel)] text-[12px] shrink-0',
  'hover:bg-[var(--today-accent)] hover:[filter:brightness(0.92)]',
  '@max-[430.01px]:col-span-full @max-[430.01px]:justify-self-center',
);

const DailyPoolDiscussion = lazy(() => import('./DailyPoolDiscussion.tsx'));

export function DailyPoolPanel({
  pool,
  date,
  dateParam,
  today,
  availableDates,
  isFallback,
  onRefresh,
  discussionOpen,
  focusCommentId,
}: {
  pool: DailySealedPool;
  date: string;
  dateParam?: string;
  today: string;
  availableDates: string[];
  isFallback: boolean;
  onRefresh: () => void;
  discussionOpen: boolean;
  focusCommentId?: string;
}) {
  const personal = useDailySealedBuild(pool.id);
  const build = personal.build;
  return (
    <section
      className={cn(
        'today-sealed-panel @container relative border border-[color:var(--today-panel-border)] rounded-[20px]',
        '[background:radial-gradient(ellipse_at_50%_0%,_hsl(var(--card)_/_0.65),_transparent_65%),_var(--today-panel)]',
        'shadow-[0_8px_30px_-24px_#16301c55]',
      )}
      aria-labelledby="today-pool-title"
    >
      <LeaderHand pool={pool} date={dateParam} />
      <header
        className={cn(
          'today-pool-copy px-6 pt-1 pb-5.5',
          'max-phone:px-4 max-phone:pt-0 max-phone:pb-4',
        )}
      >
        <h2
          id="today-pool-title"
          className={cn(
            'mx-0! mt-1! mb-2! p-0! border-0! text-[clamp(25px,_6cqi,_36px)]! font-semibold! tracking-[-0.045em]!',
            'leading-[1.12]! text-center',
          )}
        >
          Daily sealed pool
        </h2>
        <p
          className={cn(
            'today-shared-challenge mx-0! mt-0! mb-4.5! text-center text-[12px]! leading-[1.6]!',
            'text-muted-foreground',
            'max-phone:mb-3! max-phone:text-[11px]!',
          )}
        >
          Everyone gets the same eight packs. What would you build?
        </p>
        {isFallback && (
          <div
            className={cn(
              'today-pool-notice flex items-center flex-wrap gap-y-1 gap-x-2.5 mb-3.5 py-[9px] px-[11px] border',
              'border-[color:var(--today-panel-border)] rounded-[7px] text-[11px] leading-[1.5]',
              'text-muted-foreground',
              '[&_button]:shrink-0 [&_button]:text-[color:var(--today-accent)] [&_button]:underline',
              '[&_button]:underline-offset-3',
              '[&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-[var(--today-accent)]',
              '[&_button:focus-visible]:outline-offset-3',
            )}
            role="status"
          >
            <span>
              Today’s pool is on its way. Play the latest pool from {formatPoolDate(date)}.
            </span>
            <button type="button" onClick={onRefresh}>
              Check again
            </button>
          </div>
        )}
        <div
          className={cn(
            'today-pool-summary grid grid-cols-[auto_minmax(0,_1fr)_auto] items-center gap-3',
            '@max-[430.01px]:grid-cols-[1fr_1fr]',
            'max-phone:gap-2.5',
          )}
        >
          <PoolDatePicker date={date} today={today} availableDates={availableDates} />
          <div
            className={cn(
              'today-pool-edition grid gap-[3px] justify-items-center text-[12px] font-medium',
              '[&_span_+_span]:text-muted-foreground [&_span_+_span]:text-[10px] [&_span_+_span]:font-normal',
              '@max-[430.01px]:justify-self-end',
            )}
          >
            <span>{setInfo[pool.set].name}</span>
            <span>{pool.boosterCount} packs</span>
          </div>
          {personal.isPending ? (
            <Button disabled className={todayBuildButtonClassName} aria-label="Loading your build">
              Loading your build…
            </Button>
          ) : (
            <Button asChild className={todayBuildButtonClassName}>
              {build ? (
                <Link to="/limited/deck/$deckId" params={{ deckId: build.id }} search={{}}>
                  Open your build <ArrowRight size={16} />
                </Link>
              ) : (
                <PoolLink poolId={pool.id} startPublicDeck>
                  Build this pool <ArrowRight size={16} />
                </PoolLink>
              )}
            </Button>
          )}
        </div>
      </header>
      {personal.isPending && (
        <div
          className="today-own-state flex items-center gap-2 px-6 pt-0 pb-3.5 text-[11px] text-muted-foreground"
          role="status"
        >
          Checking your builds…
        </div>
      )}
      {personal.isError && (
        <div
          className="today-own-state flex items-center gap-2 px-6 pt-0 pb-3.5 text-[11px] text-muted-foreground"
          role="alert"
        >
          Couldn’t load your build.
          <Button variant="link" size="sm" onClick={() => void personal.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {build && (
        <section
          className={cn(
            'today-own-build px-6 pt-5 pb-6.5 border-t border-t-[var(--today-panel-border)]',
            '[&_.today-builds-heading]:mb-5',
            'max-phone:px-4 max-phone:pt-4 max-phone:pb-5.5',
          )}
          aria-labelledby="today-own-build-title"
        >
          <div className="today-builds-heading flex items-baseline justify-between gap-3 mx-1 mt-0 mb-3.5">
            <h3
              id="today-own-build-title"
              className="m-0! p-0! border-0! text-[13px]! font-semibold!"
            >
              Your build for this pool
            </h3>
            <PoolLink
              poolId={pool.id}
              startPublicDeck
              className={cn(
                'today-all-decks inline-flex items-center gap-[5px] text-[color:var(--today-accent)] text-[10px]',
                'whitespace-nowrap',
                'hover:underline',
                'focus-visible:outline-2 focus-visible:outline-[var(--today-accent)] focus-visible:outline-offset-3',
              )}
            >
              Try another build <ArrowRight size={13} />
            </PoolLink>
          </div>
          <CompactDeckRow
            deckId={build.id}
            name={build.name}
            leaderId={build.leaderCardId1}
            baseId={build.baseCardId}
            limited
            headingLevel="h4"
            className="today-own-deck"
            metadata={
              <span>
                {build.public === 0 ? 'Private' : build.public === 2 ? 'Unlisted' : 'Public'}
              </span>
            }
          />
        </section>
      )}
      <NewestBuilds pool={pool} />
      <div
        className={cn(
          'today-pool-footer flex items-center justify-between flex-wrap gap-3 mt-5.5 px-6 pt-0 pb-4',
          '[&_.today-reset]:m-0 [&_.today-reset]:p-0',
        )}
      >
        <Link
          to="/"
          search={previous => ({
            ...previous,
            homeMode: 'today',
            // Pin the thread to this pool so a UTC rollover cannot replace a draft.
            poolDate: date,
            poolDiscussion: discussionOpen ? undefined : true,
            poolComment: undefined,
          })}
          className={cn(
            'today-discussion-toggle inline-flex items-center gap-[7px] text-foreground text-[12px] font-medium',
            'rounded-[6px] py-[5px] px-0',
            'hover:text-[color:var(--today-accent,_hsl(var(--primary)))]',
            'focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-4',
          )}
          aria-expanded={discussionOpen}
          aria-controls="daily-pool-discussion"
          resetScroll={false}
        >
          <MessageCircle size={15} /> Pool discussion
          <ChevronDown size={14} className={discussionOpen ? 'rotate-180' : ''} />
        </Link>
        <footer className="today-reset flex items-center justify-center gap-1.5 py-5 px-4 text-muted-foreground text-[10px]">
          <Clock3 size={12} /> Fresh cards every day at 00:00 UTC
        </footer>
      </div>
      {discussionOpen && (
        <div id="daily-pool-discussion" className="today-pool-discussion mx-4 mt-0 mb-4 min-w-0">
          <Suspense
            fallback={
              <p role="status" className="p-5 text-sm text-muted-foreground">
                Loading pool discussion…
              </p>
            }
          >
            <DailyPoolDiscussion poolId={pool.id} focusCommentId={focusCommentId} />
          </Suspense>
        </div>
      )}
    </section>
  );
}
