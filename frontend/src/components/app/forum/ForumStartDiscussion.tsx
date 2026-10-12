import { ArrowRight } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { getCardImageUrl } from '@/components/app/global/cardImageLib.ts';

export function ForumStartDiscussion() {
  return (
    <aside
      aria-label="Join the conversation"
      className="relative flex min-w-0 items-center gap-3 overflow-hidden rounded-[20px] border border-[color:var(--forum-border)] bg-linear-to-br from-[var(--forum-panel)] to-card p-5 sm:gap-4"
    >
      <div className="relative z-10 min-w-0 flex-1">
        <p className="m-0! text-sm! font-semibold! leading-snug! text-foreground">
          Even droids have opinions.
        </p>
        <p className="mb-0! mt-2! text-xs! leading-relaxed! text-muted-foreground">
          Got a question or a wild brew? Let’s hear it.
        </p>
        <Link
          to="/forum/new"
          className="group mt-4 inline-flex items-center gap-2 rounded-sm text-lg font-semibold tracking-tight text-[color:var(--forum-accent)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--forum-accent)] focus-visible:ring-offset-4 sm:text-xl"
        >
          Start a thread
          <ArrowRight
            size={20}
            className="shrink-0 motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
            aria-hidden="true"
          />
        </Link>
      </div>
      <figure className="relative m-0! w-20 shrink-0 sm:w-24">
        <div className="relative h-20 overflow-hidden rounded-full ring-4 ring-background/70 sm:h-24">
          {/* Crop the artwork area of the existing hyperspace card, excluding its frame/text. */}
          <img
            src={getCardImageUrl(
              'r2-d2--full-of-solutions-458-twilight-of-the-republic-front.webp',
            )}
            alt="R2-D2, Full of Solutions"
            className="absolute -left-8 -top-8 w-40 max-w-none! sm:-left-10 sm:-top-10 sm:w-48"
          />
        </div>
        <figcaption className="mt-2 text-center text-[10px] leading-tight text-muted-foreground">
          Art by David Nash
        </figcaption>
      </figure>
    </aside>
  );
}
