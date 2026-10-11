import { Link } from '@tanstack/react-router';
import { ArrowUpRight } from 'lucide-react';
import CardArtCrop from '@/components/app/global/CardArtCrop.tsx';
import { cn } from '@/lib/utils.ts';
import type { CardList } from '../../../../../lib/swu-resources/types.ts';
import { getArtistCollage, type ArtistDirectoryEntry } from './artistDirectoryHelpers.ts';

const artworkPositions = [
  '-rotate-6 translate-y-2 z-10',
  'rotate-3 -translate-y-3 z-20',
  '-rotate-3 translate-y-3 z-10',
  'rotate-6 -translate-y-1 z-20',
  '-rotate-6 translate-y-4 z-10',
  'rotate-3 -translate-y-2 z-20',
];

export default function ArtistDirectoryHero({
  cards,
  artists,
}: {
  cards: CardList;
  artists: ArtistDirectoryEntry[];
}) {
  const artworks = getArtistCollage(cards, artists);
  if (!artworks.length) return null;
  return (
    <section aria-label="Explore the artists" className="relative -mx-2 isolate overflow-hidden">
      <div className="mx-auto grid max-w-[1648px] grid-cols-3 items-center justify-items-center gap-y-6 px-6 py-8 sm:grid-cols-5 sm:py-10 xl:grid-cols-10">
        {artworks.map(({ artist, printing }, index) => (
          <Link
            key={`${printing.card.cardId}:${printing.variant.variantId}`}
            to="/artists/$artistKey"
            params={{ artistKey: artist.key }}
            aria-label={`Explore artwork by ${artist.name}`}
            className={cn(
              'group relative isolate w-max max-w-[calc(100%+1.5rem)] overflow-hidden bg-muted shadow-lg transition-transform duration-300 hover:z-30 hover:rotate-0 focus-visible:z-30 focus-visible:rotate-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-8px] focus-visible:outline-primary motion-reduce:transition-none',
              artworkPositions[index % artworkPositions.length],
              artworks.length % 3 === 1 &&
                index === artworks.length - 1 &&
                'col-start-2 sm:col-start-auto',
            )}
          >
            <div aria-hidden="true">
              {/* Intrinsic SVG dimensions cap the crop at native size; only shrink to fit. */}
              <CardArtCrop
                card={printing.card}
                cardVariantId={printing.variant.variantId}
                alt=""
                className="w-auto max-w-full"
              />
            </div>
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/90 via-black/10 to-transparent px-6 pb-2 pt-1 text-white transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100 motion-reduce:transition-none [@media(hover:none)]:opacity-100">
              <div className="flex w-full items-end justify-between gap-2">
                <span className="min-w-0 break-words text-xs font-medium leading-snug">
                  {artist.name}
                </span>
                <ArrowUpRight aria-hidden="true" className="hidden size-3 shrink-0 md:block" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
