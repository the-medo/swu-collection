import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { ArrowUpRight } from 'lucide-react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { getArtistDirectory } from '../../../../../shared/lib/artists.ts';
import { useGetArtistNames } from '@/api/artists/useGetArtist.ts';
import CardArtCrop from '@/components/app/global/CardArtCrop.tsx';
import { hasArtistArtCrop } from './artistGallery.ts';
import ArtistDirectoryHero from './ArtistDirectoryHero.tsx';
import {
  artistDirectorySortSchema,
  sortArtistDirectory,
  type ArtistDirectorySearch,
} from './artistDirectoryHelpers.ts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';

export default function ArtistDirectory({
  search,
  onSearchChange,
}: {
  search: ArtistDirectorySearch;
  onSearchChange: (patch: Partial<ArtistDirectorySearch>, replace?: boolean) => void;
}) {
  const catalog = useCardList();
  const profiles = useGetArtistNames();
  const artists = useMemo(
    () =>
      getArtistDirectory(catalog.data?.cards ?? {}, profiles.data, {
        featuredFilter: hasArtistArtCrop,
      }),
    [catalog.data, profiles.data],
  );
  const filtered = useMemo(() => sortArtistDirectory(artists, search), [artists, search]);

  return (
    <div className="flex w-full flex-col">
      <Helmet title="Artist showcase | SWUBase" />
      {/* Reserve the usual ten-artwork collage; a smaller catalog may use fewer rows. */}
      {catalog.isPending || profiles.isPending ? (
        <div
          aria-hidden="true"
          className="-mx-2 h-[590px] animate-pulse bg-muted sm:h-[408px] xl:h-[240px] motion-reduce:animate-none"
        />
      ) : (
        <ArtistDirectoryHero cards={catalog.data?.cards ?? {}} artists={artists} />
      )}
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-2 pb-6 sm:px-6">
        <header className="mx-auto max-w-4xl space-y-4 pb-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            The art of Star Wars: Unlimited
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Discover the people behind the cards. Explore their artwork and find more from your
            favorites.
          </p>
        </header>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="w-full max-w-md space-y-2">
            <label htmlFor="artist-directory-search" className="text-sm font-medium">
              Find an artist
            </label>
            <Input
              id="artist-directory-search"
              maxLength={150}
              value={search.artistDirectorySearch ?? ''}
              onChange={event =>
                onSearchChange({ artistDirectorySearch: event.target.value || undefined }, true)
              }
              placeholder="Search names or card credits..."
            />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            {catalog.isSuccess && !profiles.isPending && (
              <p role="status" className="pb-2 text-sm text-muted-foreground">
                {filtered.length} artists to explore
              </p>
            )}
            <div className="w-48 space-y-2">
              <label htmlFor="artist-directory-sort" className="text-sm font-medium">
                Sort artists
              </label>
              <Select
                value={search.artistSort}
                onValueChange={value =>
                  onSearchChange({ artistSort: artistDirectorySortSchema.parse(value) })
                }
              >
                <SelectTrigger id="artist-directory-sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name A–Z</SelectItem>
                  <SelectItem value="name-desc">Name Z–A</SelectItem>
                  <SelectItem value="cards">Most cards</SelectItem>
                  <SelectItem value="printings">Most printings</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        {profiles.isError && (
          <div role="alert" className="space-y-3 rounded-lg border p-4">
            <p>Artist profiles are temporarily unavailable. Showing original card credits.</p>
            <Button variant="outline" onClick={() => void profiles.refetch()}>
              Retry artist profiles
            </Button>
          </div>
        )}
        {catalog.isPending || profiles.isPending ? (
          <p role="status">Loading artists...</p>
        ) : catalog.isError ? (
          <div role="alert" className="space-y-3">
            <p>Unable to load artists.</p>
            <Button onClick={() => void catalog.refetch()}>Try again</Button>
          </div>
        ) : !filtered.length ? (
          <p className="text-muted-foreground">No artists found.</p>
        ) : (
          <div
            role="region"
            aria-label="Artist directory"
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filtered.map(artist => (
              <Link
                key={artist.key}
                to="/artists/$artistKey"
                params={{ artistKey: artist.key }}
                className="group overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              >
                <div
                  className="grid h-44 grid-flow-col auto-cols-fr gap-0.5 overflow-hidden bg-muted"
                  aria-hidden="true"
                >
                  {artist.featured.map(({ card, variant }) => (
                    <div
                      key={`${card.cardId}:${variant.variantId}`}
                      className="min-w-0 overflow-hidden"
                    >
                      <CardArtCrop
                        card={card}
                        cardVariantId={variant.variantId}
                        alt=""
                        fit="cover"
                        loading="lazy"
                        className="h-full transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-semibold">{artist.name}</h2>
                    <ArrowUpRight
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {artist.cardCount} cards · {artist.printingCount} printings
                  </p>
                  {artist.creditKeys.length === 1 &&
                    artist.credits.some(credit => credit !== artist.name) && (
                      <p className="text-xs text-muted-foreground">
                        Credited as {artist.credits.join(' · ')}
                      </p>
                    )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
