import type { PropsWithChildren } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { workspaceStyles } from '@/components/app/global/WorkspacePage/workspaceStyles.ts';
import { cn } from '@/lib/utils.ts';

interface ComparisonTableProps extends PropsWithChildren {
  deckCount: number;
}

const ComparisonTable = ({ deckCount, children }: ComparisonTableProps) => (
  <section className={cn(workspaceStyles.panel, 'overflow-hidden rounded-lg')}>
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-[var(--workspace-border)] px-3 py-2 text-[11px]">
      <span className="font-medium">{deckCount} decks compared</span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
        <span>Compared with main</span>
        <span className="text-emerald-700 dark:text-emerald-400">+ More copies</span>
        <span className="text-rose-700 dark:text-rose-400">− Fewer copies</span>
      </span>
    </div>
    <div
      role="region"
      aria-label="Deck comparison table"
      tabIndex={0}
      className="relative isolate max-h-[75vh] overflow-auto overscroll-x-contain [--comparer-name-width:180px] md:[--comparer-name-width:250px] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    >
      {children}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-[var(--workspace-border)] px-3 py-1.5 text-[10px] text-muted-foreground">
      <span>Average includes all {deckCount} decks.</span>
      <span className="inline-flex items-center gap-1">
        <ArrowLeftRight className="size-3" /> Scroll to explore · Names stay pinned
      </span>
    </div>
  </section>
);

export default ComparisonTable;
