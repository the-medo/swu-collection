import type { ReactNode } from 'react';
import { cva } from 'class-variance-authority';
import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { DeckArtwork } from '@/components/app/decks/DeckArtwork.tsx';
import { cn } from '@/lib/utils.ts';

type DeckRowVariant = 'default' | 'winner' | 'winnerCompact';

const deckRowVariants = cva(
  cn(
    'compact-deck-row group/deck-row relative flex items-center rounded-[10px] border',
    'transition-[border-color,background] duration-150 ease-[ease] motion-reduce:transition-none',
  ),
  {
    variants: {
      variant: {
        default: 'bg-card/80',
        winner: 'my-1.5 bg-muted/40',
        winnerCompact: cn(
          'min-h-11 m-0 p-0 gap-1.5 border-transparent bg-transparent',
          'hover:bg-muted/50 focus-within:bg-muted/50',
          '@max-[560.01px]:flex-col @max-[560.01px]:gap-0.5',
        ),
      },
    },
    compoundVariants: [
      {
        variant: ['default', 'winner'],
        className: cn(
          'min-h-16.5 gap-3 border-border/80 px-3 py-[9px]',
          'hover:border-[color:var(--deck-row-accent,hsl(var(--ring)))] hover:bg-card',
          'focus-within:border-[color:var(--deck-row-accent,hsl(var(--ring)))] focus-within:bg-card',
          'max-phone:gap-[9px] max-phone:px-2.5 max-phone:py-2',
        ),
      },
    ],
  },
);

export function CompactDeckRow({
  deckId,
  name,
  leaderId,
  baseId,
  limited = false,
  metadata,
  className,
  headingLevel: Heading = 'h3',
  linkLabel,
  variant = 'default',
}: {
  deckId: string;
  name: string;
  leaderId: string | null;
  baseId: string | null;
  limited?: boolean;
  metadata: ReactNode;
  className?: string;
  headingLevel?: 'h3' | 'h4' | 'h5';
  linkLabel?: string;
  variant?: DeckRowVariant;
}) {
  const compact = variant === 'winnerCompact';
  return (
    <article className={cn(deckRowVariants({ variant }), className)}>
      <DeckArtwork leaderId={leaderId} baseId={baseId} size={compact ? 'mini' : 'default'} />
      <div
        className={cn(
          'compact-deck-copy min-w-0 flex-1',
          compact && '@max-[560.01px]:w-full @max-[560.01px]:text-center',
        )}
      >
        <Heading
          className={cn(
            'compact-deck-title mx-0! mt-0! p-0 font-medium!',
            compact
              ? 'mb-[3px]! text-[12px]! @max-[560.01px]:m-0! @max-[560.01px]:text-[10px]!'
              : 'mb-[5px]! text-[13px]! max-phone:text-[12px]!',
            'leading-[1.3]!',
          )}
        >
          <Link
            to={limited ? '/limited/deck/$deckId' : '/decks/$deckId'}
            params={{ deckId }}
            search={{}}
            aria-label={linkLabel}
            className={cn(
              "after:absolute after:inset-0 after:z-2 after:rounded-[10px] after:content-['']",
              compact ? 'block truncate' : 'line-clamp-2',
              'focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-3',
              'focus-visible:after:outline-[var(--deck-row-accent,hsl(var(--ring)))]',
            )}
          >
            {name || 'Untitled deck'}
          </Link>
        </Heading>
        <div
          className={cn(
            'compact-deck-meta flex flex-wrap items-center',
            compact ? 'gap-[3px] text-[9px] @max-[560.01px]:hidden' : 'text-[10px]',
            variant === 'default' && 'gap-x-2 gap-y-[3px]',
            variant === 'winner' && 'gap-[5px]',
            'leading-[1.4]',
            'text-muted-foreground',
            '[&_a]:relative [&_a]:z-3',
            '[&_a:hover]:underline',
          )}
        >
          {metadata}
        </div>
      </div>
      <ArrowRight
        className={cn(
          'compact-deck-arrow shrink-0 text-muted-foreground',
          compact ? 'hidden' : 'max-phone:hidden',
        )}
        size={15}
        aria-hidden="true"
      />
    </article>
  );
}
