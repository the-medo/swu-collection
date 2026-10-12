import type { ReactNode } from 'react';
import { cn } from '@/lib/utils.ts';

export function TodayFeedHeading({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string;
}) {
  return (
    <header className="today-feed-heading">
      <h2
        id={id}
        className="mx-0! mt-0! mb-2! p-0! border-0! text-[25px]! font-semibold! leading-[1.2]! tracking-[-0.04em]!"
      >
        {title}
      </h2>
      <p className="m-0! text-[12px]! leading-[1.7]! text-muted-foreground">{description}</p>
    </header>
  );
}

export function TodayFeedFooter({ children }: { children: ReactNode }) {
  return (
    <footer
      className={cn(
        'today-feed-footer flex items-center justify-between gap-3 pt-5 mt-0 text-[11px]',
        '[&_a]:flex [&_a]:items-center [&_a]:gap-2 [&_a]:text-[color:var(--today-accent)]',
        '[&_a:hover]:underline [&_>_span]:text-muted-foreground',
      )}
    >
      {children}
    </footer>
  );
}
