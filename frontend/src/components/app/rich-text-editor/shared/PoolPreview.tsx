import { useId } from 'react';
import { ArrowRight } from 'lucide-react';
import { LeaderHand } from '@/components/app/home/today/LeaderHand.tsx';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';
import { setInfo } from '../../../../../../lib/swu-resources/set-info.ts';
import type { SwuSet } from '../../../../../../types/enums.ts';
import type { CardPoolEmbed } from '../../../../../../shared/types/cardPoolEmbed.ts';
import { poolHref } from './model.ts';

export function PoolPreview({ pool }: { pool: CardPoolEmbed }) {
  const titleId = useId();
  const setName =
    pool.set && Object.prototype.hasOwnProperty.call(setInfo, pool.set)
      ? setInfo[pool.set as SwuSet].name
      : pool.set || 'Custom pool';
  return (
    <div
      className={cn(
        'rte-pool-preview min-w-0 pt-16 pb-1',
        '[--today-accent:#326149] [--today-panel:#eef2e9] [--today-panel-border:#d9e1d2]',
        'dark:[--today-accent:#b9d4a8] dark:[--today-panel:#1d2720] dark:[--today-panel-border:#364437]',
      )}
    >
      <section
        className={cn(
          '@container relative rounded-[20px] border border-[color:var(--today-panel-border)]',
          '[background:radial-gradient(ellipse_at_50%_0%,_hsl(var(--card)_/_0.65),_transparent_65%),_var(--today-panel)]',
          'shadow-[0_8px_30px_-24px_#16301c55]',
        )}
        aria-labelledby={titleId}
      >
        {pool.leaders.length > 0 && <LeaderHand pool={pool} cardLinks="detail" />}
        <div className="px-6 pb-6 pt-1">
          <h3
            id={titleId}
            className="mx-0! mb-4! mt-1! border-0! p-0! text-center text-[clamp(25px,_6cqi,_36px)]! font-semibold! leading-[1.12]! tracking-[-0.045em]! [overflow-wrap:anywhere]"
          >
            {pool.name}
          </h3>
          <div className="flex flex-wrap items-center justify-between gap-4 @max-[350px]:justify-center">
            <div className="text-center text-xs font-medium">
              <span>{setName}</span>
              {pool.boosterCount !== null && (
                <span className="mt-1 block text-[10px] font-normal text-muted-foreground">
                  {pool.boosterCount} packs
                </span>
              )}
            </div>
            <Button
              asChild
              className="h-10 shrink-0 rounded-[7px] bg-[var(--today-accent)] px-[17px] text-xs text-[color:var(--today-panel)] hover:bg-[var(--today-accent)] hover:brightness-90"
            >
              <a
                className="no-underline!"
                href={poolHref(pool.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Build this pool <ArrowRight size={16} />
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
