import { ArrowLeft, ArrowRight, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { getCardImageUrl } from '@/components/app/global/cardImageLib.ts';

// Decorative card art; the personalized recommendations load when the section opens.
const cardArtwork = [
  {
    image: 'r2-d2--ignoring-protocol-10-spark-of-rebellion---hyperspace-front.webp',
    className: 'left-0 top-7 -rotate-20',
  },
  {
    image: 'grogu--irresistible-7-shadows-of-the-galaxy---hyperspace-front.webp',
    className: 'right-0 top-5 rotate-18',
  },
  {
    image: 'jar-jar-binks--foolish-gungan-467-twilight-of-the-republic-front.webp',
    className: 'left-[27%] top-0 rotate-3',
  },
];

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
        '@container/most-played-cta group relative isolate m-2 flex w-[calc(100%_-_1rem)] shrink-0 items-center gap-3 overflow-hidden rounded-xl border px-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        active
          ? 'border-border bg-muted/30 py-4 hover:bg-muted/60'
          : 'min-h-28 border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-background py-3 hover:border-primary/50 hover:from-primary/15',
      )}
    >
      {active && (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ArrowLeft className="size-5" />
        </span>
      )}
      <span
        className={cn(
          'relative z-10 min-w-0 flex-1',
          !active && 'pr-32 @[300px]/most-played-cta:pr-40 @[560px]/most-played-cta:pr-72',
        )}
      >
        <span className="flex items-center gap-2 font-semibold">
          {!active && (
            <TrendingUp className="hidden size-4 shrink-0 text-primary @[520px]/most-played-cta:block" />
          )}
          {active ? 'Back to search results' : 'Most played cards'}
          {!active && (
            <ArrowRight className="hidden size-4 shrink-0 text-primary @[520px]/most-played-cta:block" />
          )}
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">
          {active
            ? 'Return to your saved search and filters.'
            : 'Missing something? Explore popular picks for your deck’s aspects.'}
        </span>
      </span>
      {!active && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 top-2 h-64 w-40 @[300px]/most-played-cta:-right-8 @[300px]/most-played-cta:w-44 @[560px]/most-played-cta:right-0 @[560px]/most-played-cta:w-64 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:-translate-y-1 motion-safe:group-focus-visible:-translate-y-1"
        >
          {cardArtwork.map(({ image, className }) => (
            <img
              key={image}
              src={getCardImageUrl(image)}
              alt=""
              width={300}
              height={418}
              loading="lazy"
              decoding="async"
              draggable={false}
              onError={event => {
                event.currentTarget.style.visibility = 'hidden';
              }}
              className={cn(
                'absolute w-24 rounded-md border border-white/20 shadow-lg shadow-black/25 @[300px]/most-played-cta:w-28 @[560px]/most-played-cta:w-40',
                className,
              )}
            />
          ))}
        </span>
      )}
    </button>
  );
}
