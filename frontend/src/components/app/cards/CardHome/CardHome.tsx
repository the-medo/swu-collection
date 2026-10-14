import { clearCardSearchParams } from '../AdvancedCardSearch/advancedSearchLib.ts';
import ArtistShowcaseTile from './ArtistShowcaseTile.tsx';
import PromoCardsTile from './PromoCardsTile.tsx';
import SetLogo from './SetLogo.tsx';
import { useAdvancedCardSearchStore } from '../AdvancedCardSearch/useAdvancedCardSearchStore.ts';
import { Fragment, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight, Search, SlidersHorizontal } from 'lucide-react';
import { useCardList } from '@/api/lists/useCardList.ts';
import CardArtCrop from '@/components/app/global/CardArtCrop.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { cn } from '@/lib/utils.ts';
import {
  indexCardPrintings,
  resolveCardGroupPrintings,
} from '../../../../../../shared/lib/cardGroupPrintings.ts';
import {
  getCardHomeSets,
  resolveSetGallerySelection,
  setGalleryLabels,
  type SetGalleryShortcut,
} from './cardHomeLib.ts';
import CardFan from './CardFan.tsx';
import { promoVariantIds } from './promoCards.ts';

export default function CardHome({
  onSearch,
  filtersOpen,
  onToggleFilters,
}: {
  onSearch: () => void;
  filtersOpen: boolean;
  onToggleFilters: () => void;
}) {
  const catalog = useCardList();
  const { name, setName } = useAdvancedCardSearchStore();
  const sets = useMemo(() => getCardHomeSets(catalog.data?.cards ?? {}), [catalog.data]);
  const promoArt = useMemo(
    () => resolveCardGroupPrintings(indexCardPrintings(catalog.data?.cards ?? {}), promoVariantIds),
    [catalog.data],
  );
  const hero = sets.find(set => set.leaders.length)?.leaders.slice(0, 6) ?? [];

  return (
    <div className="@container/card-home min-w-0 flex-1 overflow-hidden pb-12">
      <div className="relative isolate overflow-hidden px-4 pb-8 pt-6 @2xl/card-home:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/10 to-transparent"
        />
        <div
          aria-hidden="true"
          className="mx-auto grid h-36 max-w-5xl grid-cols-3 items-center gap-3 overflow-hidden px-3 @2xl/card-home:h-48 @2xl/card-home:grid-cols-6 @2xl/card-home:px-0"
        >
          {hero.map(({ card, variant }, i) => (
            <div
              key={variant.variantId}
              className={cn(
                'overflow-hidden rounded-sm shadow-lg',
                i % 2 ? 'rotate-6 -translate-y-2' : '-rotate-6 translate-y-2',
                i > 2 && 'hidden @2xl/card-home:block',
              )}
            >
              <CardArtCrop card={card} cardVariantId={variant.variantId} alt="" />
            </div>
          ))}
        </div>
        <header className="relative mx-auto max-w-3xl space-y-4 pt-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground dark:text-primary">
            The card library
          </p>
          <h1 className="text-4xl font-bold tracking-tight @2xl/card-home:text-5xl">
            Search for cards
          </h1>
          <p className="text-muted-foreground">
            Find your next favorite. Explore every set, special printing, and curated collection.
          </p>
          <form
            className="flex items-center gap-2 pt-3 @2xl/card-home:gap-3"
            onSubmit={event => {
              event.preventDefault();
              onSearch();
            }}
          >
            <Button
              id="card-home-filters-trigger"
              type="button"
              variant="default"
              aria-expanded={filtersOpen}
              aria-controls="card-home-filters"
              onClick={onToggleFilters}
              className={cn(
                'h-16 shrink-0 flex-col gap-1 rounded-2xl px-3 text-xs font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 @2xl/card-home:flex-row @2xl/card-home:gap-2 @2xl/card-home:px-4 @2xl/card-home:text-sm',
                filtersOpen && 'ring-2 ring-foreground ring-offset-2 ring-offset-background',
              )}
            >
              <SlidersHorizontal aria-hidden="true" className="size-4" />
              <span className="max-w-16 whitespace-normal @2xl/card-home:max-w-none">
                Advanced filters
              </span>
            </Button>
            <div className="relative min-w-0 flex-1">
              <label className="sr-only" htmlFor="card-home-search">
                Search for cards
              </label>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-5 top-5 z-10 hidden size-6 text-muted-foreground @2xl/card-home:block"
              />
              <Input
                id="card-home-search"
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder="Search for a card…"
                autoComplete="off"
                maxLength={200}
                className="h-16 rounded-2xl border-primary/25 bg-background pl-3 pr-20 text-lg shadow-lg shadow-primary/5 @2xl/card-home:pl-14 @2xl/card-home:pr-24 md:text-lg"
              />
              <Button
                type="submit"
                className="absolute right-2 top-2 h-12 rounded-xl px-3 @2xl/card-home:px-4"
                disabled={!catalog.data}
              >
                Search
              </Button>
            </div>
          </form>
        </header>
      </div>
      <div className="mx-auto max-w-7xl space-y-8 px-4 @2xl/card-home:px-8">
        {catalog.isPending ? (
          <p role="status" className="py-8 text-center text-muted-foreground">
            Loading the card library…
          </p>
        ) : catalog.isError ? (
          <div role="alert" className="rounded-xl border p-6">
            Unable to load the card library.{' '}
            <Button variant="link" onClick={() => void catalog.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            <section aria-label="Browse sets" className="space-y-4">
              <div className="grid gap-x-5 gap-y-8 @xl/card-home:grid-cols-2 @4xl/card-home:grid-cols-3">
                {sets.map((set, position) => (
                  <Fragment key={set.code}>
                    <article className="group relative isolate min-w-0 overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-lg">
                      <div
                        className="relative isolate overflow-hidden"
                        style={{
                          background: `radial-gradient(ellipse at top, ${set.info.hexColor}45, transparent 80%)`,
                        }}
                      >
                        <CardFan printings={set.featured} />
                        <div className="absolute inset-x-0 bottom-0 z-30 h-24 bg-gradient-to-t from-card via-card/80 to-transparent" />
                        <SetLogo
                          set={set.code}
                          className={cn(
                            'absolute left-1/2 z-40 -translate-x-1/2 rounded-lg bg-slate-950/90 px-3 py-1 text-white',
                            set.featured.length
                              ? 'bottom-2 h-16 w-44'
                              : 'top-1/2 h-28 w-56 -translate-y-1/2',
                          )}
                        />
                      </div>
                      <div className="space-y-4 px-5 pb-5 pt-2">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            {set.code.toUpperCase()}
                          </p>
                          <h3 className="mt-1 text-lg font-semibold">
                            <Link
                              to="/cards/sets/$setCode"
                              params={{ setCode: set.code }}
                              search={previous => ({
                                ...clearCardSearchParams(previous),
                                csCategory: 'all',
                                csVariant: 'standard',
                              })}
                              title={`${set.info.name} — All cards`}
                              className="after:absolute after:inset-0 after:z-40 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring"
                            >
                              {set.info.name}
                            </Link>
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {(
                            [
                              'leaders',
                              'showcases',
                              'all',
                              'prestige',
                              'weekly',
                            ] as SetGalleryShortcut[]
                          ).map(category =>
                            set.counts[category] ? (
                              <Link
                                key={category}
                                to="/cards/sets/$setCode"
                                params={{ setCode: set.code }}
                                search={previous => ({
                                  ...clearCardSearchParams(previous),
                                  csCategory: resolveSetGallerySelection(category).category,
                                  csVariant: resolveSetGallerySelection(category).variant,
                                })}
                                className={cn(
                                  'relative z-50 flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-xs font-medium transition-colors hover:bg-primary/10 hover:text-foreground dark:hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring',
                                  category === 'all' &&
                                    'col-span-2 bg-primary/10 text-foreground dark:text-primary',
                                )}
                              >
                                {setGalleryLabels[category]}
                                <ArrowUpRight aria-hidden="true" className="size-3.5" />
                              </Link>
                            ) : (
                              <span
                                key={category}
                                className="rounded-lg px-3 py-2.5 text-xs text-muted-foreground/60"
                                title="No printings available in this set"
                              >
                                {setGalleryLabels[category]}{' '}
                                <span className="sr-only">unavailable</span>
                                <span aria-hidden="true">—</span>
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    </article>
                    {position === 0 && <PromoCardsTile printings={promoArt} />}
                    {position === 0 && <ArtistShowcaseTile hero={hero} />}
                  </Fragment>
                ))}
                {!sets.length && <PromoCardsTile printings={promoArt} />}
                {!sets.length && <ArtistShowcaseTile hero={hero} />}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
