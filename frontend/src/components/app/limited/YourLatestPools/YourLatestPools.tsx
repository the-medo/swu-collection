import { limitedStyles } from '@/components/app/limited/limitedStyles';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useGetCardPools } from '@/api/card-pools/useGetCardPools.ts';
import { useUser } from '@/hooks/useUser.ts';
import { Button } from '@/components/ui/button.tsx';
import CardPoolBox from './CardPoolBox.tsx';

export default function YourLatestPools() {
  const user = useUser();
  return user ? <RecentPools userId={user.id} /> : null;
}

function RecentPools({ userId }: { userId: string }) {
  const [expanded, setExpanded] = useState(false);
  const { data, isPending, isError, refetch } = useGetCardPools({
    userId,
    sort: 'updated_at',
    order: 'desc',
  });
  const pools = data?.pages.flatMap(page => page.data ?? []).slice(0, 10) ?? [];
  return (
    <section aria-labelledby="your-pools-heading">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 id="your-pools-heading" className={limitedStyles.heading}>
          Your latest pools
        </h2>
        {pools.length > 4 && (
          <Button
            size="xs"
            variant="ghost"
            aria-expanded={expanded}
            aria-controls="your-recent-pools"
            onClick={() => setExpanded(value => !value)}
          >
            {expanded ? 'Show fewer' : `Show ${pools.length - 4} more`}
          </Button>
        )}
      </header>
      {isPending ? (
        <p role="status" className="m-0! text-sm text-muted-foreground">
          Loading your pools…
        </p>
      ) : isError && !data ? (
        <div role="alert" className={cn('p-3 text-sm', limitedStyles.panel)}>
          Could not load your pools.{' '}
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : pools.length ? (
        <div id="your-recent-pools" className={limitedStyles.recentGrid}>
          {pools.slice(0, expanded ? 10 : 4).map(pool => (
            <CardPoolBox key={pool.id} cardPool={pool} compact />
          ))}
        </div>
      ) : (
        <p className={cn('m-0! p-3 text-sm text-muted-foreground', limitedStyles.panel)}>
          Create your first pool and pick up where you left off here.
        </p>
      )}
    </section>
  );
}
