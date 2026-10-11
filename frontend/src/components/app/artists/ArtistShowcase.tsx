import { useMemo, useRef, useState } from 'react';
import { Link, Navigate } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ExternalLink, Palette, Search, ZoomIn } from 'lucide-react';
import { useGetArtist } from '@/api/artists/useGetArtist.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import {
  getArtistKey,
  getArtistPrintings,
  getFeaturedArtistPrintings,
} from '../../../../../shared/lib/artists.ts';
import { getCardImageUrl } from '@/components/app/global/cardImageLib.ts';
import ArtistArtworkViewer from './ArtistArtworkViewer.tsx';
import CardArtCrop from '@/components/app/global/CardArtCrop.tsx';
import {
  filterArtistPrintings,
  getArtistArtworkKey,
  getArtistSetName,
  hasArtistArtCrop,
  type ArtistGallerySearch,
} from './artistGallery.ts';

export default function ArtistShowcase({
  artistKey,
  search,
  onSearchChange,
  onCloseViewer,
}: {
  artistKey: string;
  search: ArtistGallerySearch;
  onSearchChange: (patch: Partial<ArtistGallerySearch>, replace?: boolean) => void;
  onCloseViewer: () => void;
}) {
  const profile = useGetArtist(artistKey);
  const catalog = useCardList();
  const [pagination, setPagination] = useState({ filter: '', count: 60 });
  const returnFocus = useRef<HTMLElement | null>(null);
  const galleryHeading = useRef<HTMLHeadingElement>(null);
  const printings = useMemo(
    () =>
      getArtistPrintings(catalog.data?.cards ?? {}, artistKey, {
        creditKeys: profile.data?.creditKeys,
      }),
    [catalog.data, artistKey, profile.data?.creditKeys],
  );
  const creditedPrintings = useMemo(
    () =>
      getArtistPrintings(catalog.data?.cards ?? {}, artistKey, {
        includeDuplicates: true,
        creditKeys: profile.data?.creditKeys,
      }),
    [catalog.data, artistKey, profile.data?.creditKeys],
  );
  const credits = [
    ...new Set(creditedPrintings.map(({ variant }) => variant.artist.trim())),
  ].sort();
  const artistName = profile.data?.name ?? creditedPrintings[0]?.variant.artist.trim();
  const filtered = useMemo(() => filterArtistPrintings(printings, search), [printings, search]);
  const filterKey = JSON.stringify([search.artistSearch, search.artistSet, search.artistTreatment]);
  const visibleCount = pagination.filter === filterKey ? pagination.count : 60;
  const selectedIndex = search.artistArtwork
    ? filtered.findIndex(printing => getArtistArtworkKey(printing) === search.artistArtwork)
    : -1;
  const featured = useMemo(
    () => getFeaturedArtistPrintings(printings.filter(hasArtistArtCrop), 1)[0],
    [printings],
  );
  const sets: string[] = [...new Set(printings.map(({ variant }) => variant.set))].sort((a, b) =>
    getArtistSetName(a).localeCompare(getArtistSetName(b)),
  );
  const treatments = [...new Set(printings.map(({ variant }) => variant.variantName))].sort();
  const isNotFound =
    profile.error?.status === 404 && catalog.isSuccess && !creditedPrintings.length;
  const hasFilters = !!(search.artistSearch || search.artistSet || search.artistTreatment);
  const updateFilters = (patch: Partial<ArtistGallerySearch>, replace = false) =>
    onSearchChange({ ...patch, artistArtwork: undefined }, replace);
  const resetFilters = () =>
    updateFilters({ artistSearch: undefined, artistSet: undefined, artistTreatment: undefined });
  const allArtistsLink = (
    <Link
      to="/artists"
      className="flex w-fit items-center gap-2 text-sm font-medium text-foreground hover:underline dark:text-primary"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All artists
    </Link>
  );

  // Old credit URLs remain valid; replace them with the canonical URL without
  // losing filters, selected artwork, or browser history position.
  if (profile.data && profile.data.key !== getArtistKey(artistKey)) {
    return (
      <Navigate
        to="/artists/$artistKey"
        params={{ artistKey: profile.data.key }}
        search={previous => previous}
        state={true}
        replace
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 p-2 sm:p-6">
      <Helmet title={`${artistName ?? 'Artist showcase'} | SWUBase`} />
      {!artistName && allArtistsLink}
      {!artistName && (profile.isPending || catalog.isPending) ? (
        <p role="status">Loading artist...</p>
      ) : !artistName ? (
        <div role="alert" className="space-y-3">
          <h1 className="text-2xl font-semibold">
            {isNotFound ? 'Artist not found' : 'Unable to load artist'}
          </h1>
          <p className="text-muted-foreground">
            {catalog.isError
              ? 'Please try again.'
              : (profile.error?.message ?? 'Please try again.')}
          </p>
          {!isNotFound && (
            <Button
              onClick={() => {
                if (profile.isError) void profile.refetch();
                if (catalog.isError) void catalog.refetch();
              }}
            >
              Try again
            </Button>
          )}
        </div>
      ) : (
        <>
          <header className="relative isolate overflow-hidden rounded-2xl border bg-card">
            {featured && (
              <>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 -z-10 h-full w-full scale-110 opacity-50 blur-[2px]"
                >
                  <CardArtCrop
                    card={featured.card}
                    cardVariantId={featured.variant.variantId}
                    alt=""
                    fit="cover"
                    className="h-full"
                  />
                </div>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-card/80 via-card/60 to-card/40"
                />
              </>
            )}
            <div className="grid items-center gap-6 p-5 sm:p-8 md:grid-cols-[minmax(0,1fr)_250px]">
              <div className="min-w-0 space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {allArtistsLink}
                  <span aria-hidden="true" className="text-foreground/50">
                    /
                  </span>
                  <p className="flex items-center gap-2 font-medium text-foreground/85">
                    <Palette className="h-4 w-4" aria-hidden="true" /> Artist showcase
                  </p>
                </div>
                <h1 className="break-words text-3xl font-bold tracking-tight sm:text-5xl">
                  {artistName}
                </h1>
                {catalog.data && (
                  <p className="text-foreground/85">
                    {new Set(printings.map(({ card }) => card.cardId)).size} cards ·{' '}
                    {printings.length} printings
                  </p>
                )}
                {profile.data?.biography && (
                  <section aria-label="About the artist">
                    <p className="max-w-2xl whitespace-pre-line break-words leading-relaxed text-foreground/85">
                      {profile.data.biography}
                    </p>
                  </section>
                )}
                {!!profile.data?.links.length && (
                  <nav aria-label="Find the artist" className="flex flex-wrap gap-2">
                    {profile.data.links.map(link => (
                      <Button key={link.id} asChild variant="outline" size="sm">
                        <a href={link.url} target="_blank" rel="noopener noreferrer">
                          {link.label}
                          <ExternalLink className="ml-2 h-3.5 w-3.5" aria-hidden="true" />
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      </Button>
                    ))}
                  </nav>
                )}
                {credits.some(credit => credit !== artistName) && (
                  <details className="max-w-2xl text-sm text-foreground/85">
                    <summary className="w-fit cursor-pointer">Original card credits</summary>
                    <p className="mt-2 break-words">{credits.join(' · ')}</p>
                  </details>
                )}
              </div>
              {featured && (
                <figure className="hidden space-y-2 md:block">
                  <CardArtCrop
                    card={featured.card}
                    cardVariantId={featured.variant.variantId}
                    alt={`Featured artwork: ${featured.card.name}`}
                    className="rounded-xl shadow-xl"
                  />
                  <figcaption className="text-center text-xs text-foreground/85">
                    Featured: {featured.card.name}
                  </figcaption>
                </figure>
              )}
            </div>
          </header>
          {profile.isPending ? (
            <p role="status">Loading artist profile...</p>
          ) : (
            profile.isError && (
              <div role="alert" className="space-y-3 rounded-lg border p-4">
                <p>Artist biography and links are temporarily unavailable.</p>
                <Button variant="outline" onClick={() => void profile.refetch()}>
                  Try again
                </Button>
              </div>
            )
          )}
          <section aria-labelledby="artist-cards-title" className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2
                id="artist-cards-title"
                ref={galleryHeading}
                tabIndex={-1}
                className="text-2xl font-semibold"
              >
                Card artwork
              </h2>
              {catalog.isSuccess && (
                <p role="status" className="text-sm text-muted-foreground">
                  {filtered.length} of {printings.length} printings
                </p>
              )}
            </div>
            {!!printings.length && (
              <div className="grid items-end gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[minmax(200px,1fr)_minmax(150px,240px)_minmax(150px,220px)_auto]">
                <div className="space-y-2">
                  <label htmlFor="artist-card-search" className="text-sm font-medium">
                    Search artwork
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="artist-card-search"
                      className="pl-9"
                      value={search.artistSearch ?? ''}
                      maxLength={150}
                      placeholder="Card name..."
                      onChange={event =>
                        updateFilters({ artistSearch: event.target.value || undefined }, true)
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label id="artist-set-label" className="text-sm font-medium">
                    Set
                  </label>
                  <Select
                    value={search.artistSet ?? 'all'}
                    onValueChange={value =>
                      updateFilters({ artistSet: value === 'all' ? undefined : value })
                    }
                  >
                    <SelectTrigger aria-labelledby="artist-set-label">
                      <SelectValue placeholder="All sets" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sets</SelectItem>
                      {search.artistSet && !sets.includes(search.artistSet) && (
                        <SelectItem value={search.artistSet}>
                          {getArtistSetName(search.artistSet)}
                        </SelectItem>
                      )}
                      {sets.map(set => (
                        <SelectItem key={set} value={set}>
                          {getArtistSetName(set)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label id="artist-treatment-label" className="text-sm font-medium">
                    Treatment
                  </label>
                  <Select
                    value={search.artistTreatment ?? 'all'}
                    onValueChange={value =>
                      updateFilters({ artistTreatment: value === 'all' ? undefined : value })
                    }
                  >
                    <SelectTrigger aria-labelledby="artist-treatment-label">
                      <SelectValue placeholder="All treatments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All treatments</SelectItem>
                      {search.artistTreatment && !treatments.includes(search.artistTreatment) && (
                        <SelectItem value={search.artistTreatment}>
                          {search.artistTreatment}
                        </SelectItem>
                      )}
                      {treatments.map(treatment => (
                        <SelectItem key={treatment} value={treatment}>
                          {treatment}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" disabled={!hasFilters} onClick={resetFilters}>
                  Clear filters
                </Button>
              </div>
            )}
            {search.artistArtwork &&
              selectedIndex < 0 &&
              catalog.isSuccess &&
              !profile.isPending && (
                <div role="alert" className="flex flex-wrap items-center gap-3">
                  <p>This artwork is not in the current results.</p>
                  <Button
                    variant="outline"
                    onClick={() => onSearchChange({ artistArtwork: undefined }, true)}
                  >
                    Dismiss
                  </Button>
                </div>
              )}
            {catalog.isPending ? (
              <p role="status">Loading card artwork...</p>
            ) : catalog.isError && !catalog.data ? (
              <div role="alert" className="space-y-3">
                <p>Unable to load card artwork.</p>
                <Button onClick={() => void catalog.refetch()}>Try again</Button>
              </div>
            ) : !printings.length ? (
              <p className="text-muted-foreground">
                {creditedPrintings.length
                  ? 'All credited printings are hidden by the duplicate artwork filter.'
                  : 'No credited cards are currently available.'}
              </p>
            ) : !filtered.length ? (
              <div className="space-y-3 rounded-xl border border-dashed p-8 text-center">
                <p>No artwork matches these filters.</p>
                <Button variant="outline" onClick={resetFilters}>
                  Show all artwork
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                  {filtered.slice(0, visibleCount).map(printing => (
                    <article
                      key={getArtistArtworkKey(printing)}
                      className="group flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card"
                    >
                      <button
                        type="button"
                        aria-label={`Enlarge ${printing.card.name}, ${printing.variant.set.toUpperCase()} #${printing.variant.cardNo}, ${printing.variant.variantName}`}
                        className="relative flex aspect-[300/418] w-full items-center justify-center bg-muted/30 p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                        onClick={event => {
                          returnFocus.current = event.currentTarget;
                          onSearchChange({ artistArtwork: getArtistArtworkKey(printing) });
                        }}
                      >
                        <img
                          src={getCardImageUrl(printing.variant.image.front)}
                          alt={`card-${printing.card.cardId}`}
                          loading="lazy"
                          className="max-h-full max-w-full rounded-lg object-contain transition-transform group-hover:scale-[1.02]"
                        />
                        <ZoomIn
                          className="absolute bottom-3 right-3 h-7 w-7 rounded-full bg-background/90 p-1.5 text-foreground shadow"
                          aria-hidden="true"
                        />
                      </button>
                      <div className="flex flex-1 flex-col gap-2 p-3">
                        <Link
                          to="/cards/detail/$cardId"
                          params={{ cardId: printing.card.cardId }}
                          search={{ cardVariantId: printing.variant.variantId }}
                          className="text-sm font-medium hover:underline"
                        >
                          {printing.card.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {printing.variant.set.toUpperCase()} #{printing.variant.cardNo} ·{' '}
                          {printing.variant.variantName}
                        </p>
                        <p className="mt-auto text-xs text-muted-foreground">
                          Art by {printing.variant.artist}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
                {visibleCount < filtered.length && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => setPagination({ filter: filterKey, count: visibleCount + 60 })}
                    >
                      Show more artwork
                    </Button>
                  </div>
                )}
              </>
            )}
          </section>
          <ArtistArtworkViewer
            printings={filtered}
            index={selectedIndex}
            onSelect={printing =>
              onSearchChange({ artistArtwork: getArtistArtworkKey(printing) }, true)
            }
            onClose={onCloseViewer}
            onRestoreFocus={() => {
              if (returnFocus.current?.isConnected) returnFocus.current.focus();
              else galleryHeading.current?.focus();
            }}
          />
        </>
      )}
    </div>
  );
}
