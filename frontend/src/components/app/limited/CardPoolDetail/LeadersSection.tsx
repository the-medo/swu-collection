import { useMemo } from 'react';
import type { CardPool } from '../../../../../../server/db/schema/card_pool.ts';
import { LeaderHand } from '@/components/app/home/today/LeaderHand.tsx';

export interface LeadersSectionProps {
  pool?: CardPool;
}

export default function LeadersSection({ pool }: LeadersSectionProps) {
  const leaders = useMemo(() => {
    const counts = new Map<string, number>();
    for (const cardId of (pool?.leaders ?? '').split(',').filter(Boolean)) {
      counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
    }
    return [...counts].map(([cardId, copies]) => ({ cardId, copies }));
  }, [pool?.leaders]);

  return (
    <section aria-label="Pool leaders" className="min-w-0">
      {leaders.length ? (
        <div className="@container mx-auto w-full max-w-[640px] pt-3 [--today-accent:var(--limited-accent)] [--today-panel-border:var(--limited-border)]">
          <LeaderHand
            pool={{ leaders, set: pool?.set ?? null }}
            layout="inline"
            cardLinks="modal"
          />
        </div>
      ) : (
        <p className="m-0! px-3 py-2 text-xs text-muted-foreground">
          No leaders selected for this pool.
        </p>
      )}
    </section>
  );
}
