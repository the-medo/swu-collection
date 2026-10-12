import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { cn } from '@/lib/utils.ts';

function DeckFeedState({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return (
    <div
      role={error ? 'alert' : undefined}
      className={cn(
        'today-resume-state flex flex-1 flex-col items-center justify-center gap-4.5 min-h-57.5 py-8 px-2 text-center',
        '[&_>_svg]:text-[color:var(--today-accent)]',
      )}
    >
      {children}
    </div>
  );
}

/** Shared presentation; each feed owns its query and viewer permissions. */
export function DeckFeedPanel({
  id,
  className,
  title,
  description,
  isPending,
  isError,
  isEmpty,
  loadingLabel,
  errorMessage,
  retryLabel,
  onRetry,
  empty,
  children,
  footer,
}: {
  id: string;
  className?: string;
  title: string;
  description: string;
  isPending: boolean;
  isError: boolean;
  isEmpty: boolean;
  loadingLabel: string;
  errorMessage: string;
  retryLabel: string;
  onRetry: () => void;
  empty: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}) {
  const listClassName = 'today-resume-list grid grid-cols-1 gap-5 mt-7 max-phone:gap-3.5';
  return (
    <section
      className={cn(
        className,
        'today-deck-panel flex flex-col min-w-0 p-6 border border-border rounded-[20px] bg-card max-phone:py-6 max-phone:px-5',
      )}
      aria-labelledby={`${id}-title`}
    >
      <header className="today-deck-panel-heading">
        <h2
          id={`${id}-title`}
          className="mx-0! mt-0! mb-2! p-0! border-0! text-[25px]! font-semibold! leading-[1.2]! tracking-[-0.04em]!"
        >
          {title}
        </h2>
        <p className="m-0! text-[12px]! leading-[1.7]! text-muted-foreground">{description}</p>
      </header>
      {isPending ? (
        <div role="status" aria-label={loadingLabel} className={listClassName}>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <DeckFeedState error>
          <p className="max-w-72.5 m-0! text-muted-foreground text-[13px]! leading-[1.7]!">
            {errorMessage}
          </p>
          <Button variant="outline" onClick={onRetry}>
            {retryLabel}
          </Button>
        </DeckFeedState>
      ) : isEmpty ? (
        <DeckFeedState>{empty}</DeckFeedState>
      ) : (
        <div className={listClassName}>{children}</div>
      )}
      <footer
        className={cn(
          'today-deck-panel-footer flex items-center justify-between gap-3 pt-5 mt-0 text-[11px]',
          '[&_a]:flex [&_a]:items-center [&_a]:gap-2 [&_a]:text-[color:var(--today-accent)]',
          '[&_a:hover]:underline [&_>_span]:text-muted-foreground',
        )}
      >
        {footer}
      </footer>
    </section>
  );
}
