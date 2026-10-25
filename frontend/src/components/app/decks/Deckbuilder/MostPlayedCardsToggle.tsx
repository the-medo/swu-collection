import { ArrowLeft, ArrowRight, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

interface MostPlayedCardsToggleProps {
  active: boolean;
  onClick: () => void;
}

export default function MostPlayedCardsToggle({ active, onClick }: MostPlayedCardsToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? 'Back to search results' : 'Most played cards'}
      className={cn(
        'mx-2 mt-2 flex min-h-8 shrink-0 items-center gap-2 rounded-md border border-[var(--workspace-border)] px-2.5 py-1.5 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-card hover:bg-[var(--workspace-soft)]'
          : 'bg-[var(--workspace-soft)] text-[var(--workspace-accent)] hover:bg-primary/10',
      )}
    >
      {active ? (
        <ArrowLeft className="size-3.5 shrink-0" />
      ) : (
        <TrendingUp className="size-3.5 shrink-0" />
      )}
      <span className="font-semibold">
        {active ? 'Back to search results' : 'Most played cards'}
      </span>
      {!active && (
        <span className="ml-auto hidden text-muted-foreground @[1200px]/main-body:inline">
          For your deck’s aspects
        </span>
      )}
      {!active && <ArrowRight className="ml-auto size-3.5 shrink-0" />}
    </button>
  );
}
