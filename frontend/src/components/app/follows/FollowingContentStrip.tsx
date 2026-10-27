import { Link } from '@tanstack/react-router';
import { ArrowRight, Heart } from 'lucide-react';
import { creatorKeys, hubApi, useHubQuery } from '@/api/creators';
import { Button } from '@/components/ui/button.tsx';
import { CompactCreationCard } from '@/components/app/creators/CreationCards.tsx';
import { creatorLink, creatorSubheading } from '@/components/app/creators/creatorStyles.ts';

const latestQuery = { following: true, page: 1, limit: 5 } as const;

export function FollowingContentStrip() {
  const query = useHubQuery(
    creatorKeys.followingDiscovery(latestQuery),
    () => hubApi.discover(latestQuery),
    true,
    true,
  );
  return (
    <section aria-label="Latest from your follows" className="min-w-0 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className={`${creatorSubheading} flex min-w-0 items-center gap-2`}>
          <Heart size={16} className="shrink-0 text-[var(--creator-accent)]" aria-hidden="true" />
          <span>Latest from your follows</span>
        </h2>
        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <Link to="/following" className={creatorLink}>
            Manage follows
          </Link>
          <Link
            to="/content"
            search={{ following: true, page: 1 }}
            className={`${creatorLink} flex items-center gap-1`}
          >
            View all <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>
      {query.isPending ? (
        <div role="status" className="flex gap-3 overflow-hidden pb-2">
          <span className="sr-only">Loading latest publications…</span>
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="h-24 w-72 shrink-0 rounded-xl bg-[var(--creator-soft)] motion-safe:animate-pulse sm:w-80"
            />
          ))}
        </div>
      ) : query.error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm"
        >
          <span className="text-muted-foreground">Couldn’t load your latest follows.</span>
          <Button variant="ghost" size="sm" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      ) : query.data?.items.length ? (
        <div
          className="flex snap-x snap-proximity gap-3 overflow-x-auto pb-2"
          tabIndex={0}
          role="group"
          aria-label="Latest followed publications"
        >
          {query.data.items.map(item => (
            <CompactCreationCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-[var(--creator-border)] px-4 py-3 text-xs text-muted-foreground">
          <span>New publications from the people you follow will appear here.</span>
          <Link to="/creators" className={creatorLink}>
            Explore creators
          </Link>
        </div>
      )}
    </section>
  );
}
