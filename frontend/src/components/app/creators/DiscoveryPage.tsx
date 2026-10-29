import { getDiscoveryFilters } from './discoveryFilterState.ts';
import { useId, useRef, useState } from 'react';
import { useUser } from '@/hooks/useUser.ts';
import SignInWrapper from '@/components/app/auth/SignInWrapper.tsx';
import { FollowingContentStrip } from '@/components/app/follows/FollowingContentStrip.tsx';
import { Link } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, BookOpen, Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { hubApi, creatorKeys, useHubQuery } from '@/api/creators';
import { CreationCards } from './CreationCards.tsx';
import { Status } from './CreatorControls.tsx';
import { DiscoveryFilters, DiscoveryFilterChips } from './DiscoveryFilters.tsx';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet.tsx';
import { normalizeTagIds } from '../../../../../shared/creators/taxonomy.ts';
import { CreatorHeader, CreatorLayout } from './CreatorLayout.tsx';
import {
  creatorDescription,
  creatorEmpty,
  creatorHeading,
  creatorPagination,
  creatorSelectedControl,
  creatorTheme,
} from './creatorStyles.ts';
import { type DiscoveryQuery } from '../../../../../shared/creators/contracts.ts';
export default function DiscoveryPage({
  search,
  onChange,
}: {
  search: DiscoveryQuery;
  onChange: (patch: Partial<DiscoveryQuery>) => void;
}) {
  const user = useUser();
  const searchInput = useRef<HTMLInputElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterTitleId = useId();
  const showResults = useRef(false);
  const [filterReset, setFilterReset] = useState(0);
  const query = useHubQuery(
    search.following ? creatorKeys.followingDiscovery(search) : creatorKeys.discovery(search),
    () => hubApi.discover(search),
    true,
    !!search.following,
    {
      keepPreviousData: true,
    },
  );
  const selected = normalizeTagIds(search.tags?.split(',').filter(Boolean) ?? []);
  const results = useRef<HTMLElement>(null);
  const filters = getDiscoveryFilters(search, query.data);
  const change = (patch: Partial<DiscoveryQuery>) => onChange({ ...patch, page: 1 });
  const clear = () => {
    if (searchInput.current) searchInput.current.value = '';
    setFilterReset(value => value + 1);
    onChange({
      q: undefined,
      following: undefined,
      tags: undefined,
      language: undefined,
      freshness: undefined,
      after: undefined,
      before: undefined,
      entityType: undefined,
      entityId: undefined,
      creatorId: undefined,
      series: undefined,
      page: 1,
    });
  };
  const filterControls = (
    <DiscoveryFilters key={filterReset} search={search} data={query.data} onChange={change} />
  );
  return (
    <CreatorLayout
      scrollReady={!!(search.following && !user) || (!query.isPending && !query.isPlaceholderData)}
    >
      <Helmet title="Discover SWU content | SWUBASE" />
      <CreatorHeader
        eyebrow="SWUBASE · Creator hub"
        title="Discover SWU content"
        compactMobile
        description="Watch, read and listen to the Star Wars Unlimited community. Follow your favorite creators and keep up with their latest posts."
      >
        <Button asChild size="sm" className="rounded-lg">
          <Link to="/creators">
            Meet the creators <ArrowRight size={15} />
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="rounded-lg border-white/25 bg-transparent text-[#fffaf0] hover:bg-white/10 hover:text-[#fffaf0]"
        >
          <Link to="/creator-studio">Creator studio</Link>
        </Button>
      </CreatorHeader>
      <div className="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside
          className="hidden min-w-0 space-y-4 rounded-[20px] border border-border bg-card p-5 lg:block"
          aria-label="Content filters"
        >
          <h2 className={creatorHeading}>Filters</h2>
          {filterControls}
        </aside>
        <div className="flex min-w-0 flex-col gap-4">
          <section className="min-w-0 space-y-4" aria-label="Discover content">
            <div
              className="flex flex-wrap items-center gap-3 rounded-[20px] border border-border bg-card p-3"
              role="search"
              aria-label="Find content"
            >
              <form
                className="flex min-w-0 flex-1 basis-56 gap-2"
                onSubmit={e => {
                  e.preventDefault();
                  change({
                    q: String(new FormData(e.currentTarget).get('q') ?? '').trim() || undefined,
                  });
                }}
              >
                <Input
                  aria-label="Search content"
                  placeholder="Search titles and summaries…"
                  name="q"
                  ref={searchInput}
                  key={search.q ?? ''}
                  defaultValue={search.q ?? ''}
                  className="min-w-0 rounded-lg"
                />
                <Button type="submit" aria-label="Search" className="rounded-lg">
                  <Search size={18} />
                </Button>
              </form>
              <div className="flex w-full flex-wrap items-center justify-between gap-2">
                <div
                  className="flex shrink-0 items-center gap-1"
                  role="group"
                  aria-label="Content source"
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    className={!search.following ? creatorSelectedControl : ''}
                    aria-pressed={!search.following}
                    onClick={() => change({ following: undefined })}
                  >
                    All
                  </Button>
                  <SignInWrapper text="Sign in to see following">
                    <Button
                      size="sm"
                      variant="ghost"
                      className={search.following ? creatorSelectedControl : ''}
                      aria-pressed={!!search.following}
                      onClick={() => change({ following: true })}
                    >
                      Following
                    </Button>
                  </SignInWrapper>
                </div>
                <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden">
                      <SlidersHorizontal size={15} aria-hidden="true" />
                      Filters{filters.length > 0 ? ` (${filters.length})` : ''}
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    aria-labelledby={filterTitleId}
                    className={`${creatorTheme} flex h-dvh w-full flex-col gap-0 p-0 sm:max-w-md`}
                    onCloseAutoFocus={event => {
                      if (!showResults.current) return;
                      event.preventDefault();
                      showResults.current = false;
                      results.current?.focus({ preventScroll: true });
                      results.current?.scrollIntoView({ block: 'start' });
                    }}
                  >
                    <div className="border-b p-5 pr-12">
                      <SheetTitle id={filterTitleId}>Filter content</SheetTitle>
                      <SheetDescription>
                        Refine the results, then return to your reading list.
                      </SheetDescription>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto p-5">{filterControls}</div>
                    <div className="flex shrink-0 items-center justify-between gap-3 border-t bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                      <Button variant="ghost" onClick={clear}>
                        Reset filters
                      </Button>
                      <SheetClose asChild>
                        <Button
                          onClick={() => {
                            showResults.current = true;
                          }}
                        >
                          Show results
                        </Button>
                      </SheetClose>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
              <div role="group" aria-label="Content format" className="flex w-full flex-wrap gap-1">
                {(
                  [
                    ['', 'All formats'],
                    ['video', 'Watch'],
                    ['article', 'Read'],
                    ['audio', 'Listen'],
                  ] as const
                ).map(([medium, label]) => {
                  const mediums = selected.filter(tag => tag.startsWith('medium:'));
                  const active = medium
                    ? mediums.length === 1 && mediums[0] === `medium:${medium}`
                    : !mediums.length;
                  return (
                    <Button
                      key={label}
                      variant="ghost"
                      size="sm"
                      aria-pressed={active}
                      className={active ? creatorSelectedControl : ''}
                      onClick={() =>
                        change({
                          tags:
                            [
                              ...selected.filter(tag => !tag.startsWith('medium:')),
                              ...(medium ? [`medium:${medium}`] : []),
                            ].join(',') || undefined,
                        })
                      }
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>
            <DiscoveryFilterChips filters={filters} onChange={change} onClear={clear} />
            <section
              ref={results}
              tabIndex={-1}
              data-creator-results
              aria-label="Content results"
              className="space-y-4 scroll-mt-3 [overflow-anchor:none]"
              aria-busy={query.isFetching}
            >
              {search.following && !user ? (
                <p className="text-sm text-muted-foreground">
                  Sign in to see publications from users and creators you follow.
                </p>
              ) : (
                <Status loading={query.isPending} error={query.error} />
              )}
              {query.data?.items.length === 0 && (
                <div className={`${creatorEmpty} grid justify-items-center gap-3`}>
                  <BookOpen className="size-8 text-[var(--creator-accent)]" />
                  <h2 className={`${creatorHeading} text-foreground`}>
                    No publications match these filters.
                  </h2>
                  <p className={creatorDescription}>
                    {search.following
                      ? 'No publications from your follows match these filters yet. Follow users or creators, or broaden your filters.'
                      : 'No publications match these filters yet. Try a broader search or share your own.'}
                  </p>
                </div>
              )}
              {query.data && <CreationCards items={query.data.items} compactMobile />}
              <div className={creatorPagination}>
                <Button
                  variant="outline"
                  disabled={search.page <= 1}
                  onClick={() => onChange({ page: search.page - 1 })}
                >
                  Previous
                </Button>
                <span className="text-[12px] text-muted-foreground">Page {search.page}</span>
                <Button
                  variant="outline"
                  disabled={!query.data?.hasMore}
                  onClick={() => onChange({ page: search.page + 1 })}
                >
                  Next
                </Button>
              </div>
            </section>
          </section>
          {user && !search.following && (
            <div className="min-w-0 lg:order-first">
              <FollowingContentStrip />
            </div>
          )}
        </div>
      </div>
    </CreatorLayout>
  );
}
