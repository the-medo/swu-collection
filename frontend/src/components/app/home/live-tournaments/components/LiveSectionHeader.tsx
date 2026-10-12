import { cn } from '@/lib/utils.ts';
import type { ReactNode } from 'react';

export function LiveSectionHeader({
  title,
  detail,
  count,
  action,
}: {
  title: string;
  detail?: string;
  count?: number;
  action?: ReactNode;
}) {
  return (
    <header
      className={cn(
        'live-section-heading flex items-start justify-between gap-3 mb-1.5',
        '[&_>_div]:min-w-0',
      )}
    >
      <div>
        <h3 className="m-0! p-0! text-[17px]! font-semibold! tracking-[-0.025em]!">{title}</h3>
        {detail && (
          <p className="mx-0! mt-1.5! mb-0! text-muted-foreground text-[11px]! leading-[1.5]!">
            {detail}
          </p>
        )}
      </div>
      {action ??
        (count !== undefined ? (
          <span className="live-section-count py-[3px] px-[7px] border border-border rounded-[5px] text-[11px]">
            {count}
          </span>
        ) : null)}
    </header>
  );
}
