import { Link } from '@tanstack/react-router';
import { ArrowRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { CompactDeckRow } from '../CompactDeckRow.tsx';
import type { DailySealedPool } from '../../../../../../shared/types/dailySealed.ts';
import { PoolLink } from './PoolLink.tsx';

export function NewestBuilds({ pool }: { pool: DailySealedPool }) {
  // The endpoint filters completed public builds before sorting and limiting.
  const decks = pool.decks.slice(0, 3);
  return (
    <section
      className={cn(
        'today-builds px-6 pt-5.5 pb-0 border-t border-t-[var(--today-panel-border)]',
        'max-phone:px-4 max-phone:pt-4 max-phone:pb-0',
      )}
      aria-labelledby="today-builds-title"
    >
      <div className="today-builds-heading flex items-baseline justify-between gap-3 mx-1 mt-0 mb-3.5">
        <h3 id="today-builds-title" className="m-0! p-0! border-0! text-[13px]! font-semibold!">
          Newest builds
        </h3>
        {pool.publicDeckCount > 0 && (
          <PoolLink
            poolId={pool.id}
            className={cn(
              'today-all-decks inline-flex items-center gap-[5px] text-[color:var(--today-accent)] text-[10px]',
              'whitespace-nowrap',
              'hover:underline',
              'focus-visible:outline-2 focus-visible:outline-[var(--today-accent)] focus-visible:outline-offset-3',
            )}
          >
            View all {pool.publicDeckCount} <ArrowRight size={13} />
          </PoolLink>
        )}
      </div>
      {decks.length ? (
        <div
          className={cn(
            'today-deck-list grid grid-cols-1 gap-5 py-[7px] px-0',
            'max-phone:gap-3.5',
          )}
        >
          {decks.map(item => (
            <CompactDeckRow
              key={item.id}
              deckId={item.id}
              name={item.name}
              leaderId={item.leaderCardId}
              baseId={item.baseCardId}
              limited
              headingLevel="h4"
              className="today-deck"
              metadata={
                <span className="today-deck-author overflow-hidden text-ellipsis whitespace-nowrap">
                  by{' '}
                  <Link to="/users/$userId" params={{ userId: item.author.id }}>
                    {item.author.displayName}
                  </Link>
                </span>
              }
            />
          ))}
        </div>
      ) : (
        <div className="today-empty-decks flex items-center gap-3 py-4.5 px-3 text-[color:var(--today-accent)]">
          <Users size={20} strokeWidth={1.5} />
          <div>
            <h4 className="mx-0! mt-0! mb-[5px]! text-[12px]! font-medium!">
              The first idea could be yours.
            </h4>
            <p className="m-0! text-muted-foreground text-[11px]!">
              Choose a leader and base, add 30+ cards, then make your deck public to share it here.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
