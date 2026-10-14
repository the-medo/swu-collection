import { Link } from '@tanstack/react-router';
import { ArrowUpRight, Palette } from 'lucide-react';
import CardArtCrop from '@/components/app/global/CardArtCrop.tsx';
import { cn } from '@/lib/utils.ts';
import type { CardPrinting } from '../../../../../../shared/lib/cardGroupPrintings.ts';

export default function ArtistShowcaseTile({ hero }: { hero: CardPrinting[] }) {
  return (
    <Link
      to="/artists"
      className="group relative isolate flex min-h-96 flex-col justify-end overflow-hidden rounded-2xl border border-violet-400/40 bg-slate-950 text-white shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 grid grid-cols-2 gap-2 opacity-50 transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
      >
        {hero.slice(0, 4).map(({ card, variant }, i) => (
          <CardArtCrop
            key={variant.variantId}
            card={card}
            cardVariantId={variant.variantId}
            alt=""
            fit="cover"
            loading="lazy"
            className={cn('h-full', i % 2 && 'translate-y-8')}
          />
        ))}
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-slate-950 via-violet-950/65 to-transparent"
      />
      <div className="relative space-y-3 p-6">
        <Palette className="size-8 text-violet-300" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-violet-300">
          Beyond the card frame
        </p>
        <h3 className="text-3xl font-semibold">Artist showcase</h3>
        <p className="max-w-xs text-sm leading-relaxed text-slate-300">
          Meet the artists bringing a galaxy to life. Discover the artwork behind your favorite
          cards.
        </p>
        <span className="inline-flex items-center gap-2 pt-3 text-sm font-medium">
          Explore the artists <ArrowUpRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}
