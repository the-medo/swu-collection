import { limitedStyles } from '@/components/app/limited/limitedStyles';
import { cn } from '@/lib/utils';
import { useGetCardPools } from '@/api/card-pools/useGetCardPools.ts';
import CardPoolBox from '../YourLatestPools/CardPoolBox.tsx';
import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';

export default function PublicLatestPools() {
  const { data, isPending, isError, refetch } = useGetCardPools({
    visibility: 'public',
    sort: 'updated_at',
    order: 'desc',
  });
  const pools = data?.pages.flatMap(page => page.data ?? []).slice(0, 6) ?? [];
  return (
    <section aria-labelledby="latest-pools-heading" className="min-w-0">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="latest-pools-heading" className={limitedStyles.heading}>
            Explore public pools
          </h2>
          <p className="m-0! text-xs text-muted-foreground">
            Different pulls. A different deck to discover.
          </p>
        </div>
        <Button asChild size="sm" variant="ghost" className="text-[var(--limited-accent)]">
          <Link to="/limited/public">
            View all <ArrowRight size={14} />
          </Link>
        </Button>
      </header>
      {isError && !data ? (
        <div role="alert" className={cn('p-3 text-sm', limitedStyles.panel)}>
          Could not load public pools.{' '}
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : isPending ? (
        <div role="status" className={limitedStyles.poolGrid}>
          <span className="sr-only">Loading public pools…</span>
          {[0, 1, 2, 3].map(key => (
            <div
              key={key}
              className="h-52 animate-pulse rounded-xl bg-muted motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : pools.length ? (
        <div className={limitedStyles.poolGrid}>
          {pools.map(pool => (
            <CardPoolBox key={pool.id} cardPool={pool} />
          ))}
        </div>
      ) : (
        <p className={cn('m-0! p-4 text-sm text-muted-foreground', limitedStyles.panel)}>
          No public pools yet. Generate a pool to get started.
        </p>
      )}
    </section>
  );
}
