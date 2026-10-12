import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { useRecentDiscussions } from '@/api/discussions/useRecentDiscussions.ts';
import { DiscussionFeedItem } from '@/components/app/discussions/DiscussionFeedItem.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { TodayFeedFooter, TodayFeedHeading } from './TodayFeedLayout.tsx';
export default function RecentDiscussions() {
  const query = useRecentDiscussions();
  return (
    <section
      aria-labelledby="today-discussions-title"
      className="today-discussions min-w-0 rounded-[20px] border border-border bg-card p-6 max-phone:px-5 [--discussion-accent:var(--today-accent)]"
    >
      <TodayFeedHeading
        id="today-discussions-title"
        title="Recent discussions"
        description="New conversations from the community."
      />
      {query.isPending ? (
        <div role="status" aria-label="Loading recent discussions" className="mt-4 grid gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground"
        >
          <span>Recent discussions couldn’t be loaded.</span>
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            Retry discussions
          </Button>
        </div>
      ) : !query.data?.length ? (
        <p className="mt-4! mb-0! text-[12px]! leading-[1.7]! text-muted-foreground">
          No discussions yet. Start a conversation in the forum or on a deck, card, or daily pool.
        </p>
      ) : (
        <ul className="m-0! mt-3! list-none! divide-y divide-border p-0!">
          {query.data.map(thread => (
            <li key={thread.id} className="m-0! p-0!">
              <DiscussionFeedItem entry={thread} compact />
            </li>
          ))}
        </ul>
      )}
      <TodayFeedFooter>
        <Link to="/forum">
          View forum <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </TodayFeedFooter>
    </section>
  );
}
