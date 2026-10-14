import { useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowUpRight, Loader2, Sparkles } from 'lucide-react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useCardGroupFeed } from '@/api/card-groups/useCardGroupFeed.ts';
import { useCardGroups } from '@/api/card-groups/useCardGroups.ts';
import { Button } from '@/components/ui/button.tsx';
import {
  indexCardPrintings,
  resolveCardGroupPrintings,
} from '../../../../../../shared/lib/cardGroupPrintings.ts';
import CardGalleryDisplaySettings from './CardGalleryDisplaySettings.tsx';
import CardGroupSelector from './CardGroupSelector.tsx';
import VariantGallery from './VariantGallery.tsx';
import PromoCardFan from './PromoCardFan.tsx';
import { promoVariantIds } from './promoCards.ts';
import CardGalleryListSelect from './CardGalleryListSelect.tsx';
import { useCardGalleryList } from './useCardGalleryList.ts';

export default function PromosPage({ selectedGroupId }: { selectedGroupId?: string }) {
  const list = useCardGalleryList();
  const navigate = useNavigate({ from: '/cards/promos' });
  const catalog = useCardList();
  const feed = useCardGroupFeed();
  const groupList = useCardGroups();
  const index = useMemo(() => indexCardPrintings(catalog.data?.cards ?? {}), [catalog.data]);
  const promoArt = useMemo(() => resolveCardGroupPrintings(index, promoVariantIds), [index]);
  const groups = useMemo(
    () => [
      ...new Map(
        feed.data?.pages.flatMap(page => page.data).map(group => [group.id, group]),
      ).values(),
    ],
    [feed.data],
  );
  const selectedGroup = groupList.data?.find(group => group.id === selectedGroupId);
  const displayedGroups = selectedGroup
    ? [selectedGroup, ...groups.filter(group => group.id !== selectedGroup.id)]
    : groups;
  const selectGroup = (id: string | undefined) =>
    void navigate({
      search: previous => ({ ...previous, promoGroup: id }),
      resetScroll: false,
    });
  const sentinel = useRef<HTMLDivElement>(null);
  const ready = !!catalog.data && !!feed.data;
  const { hasNextPage, isFetching, isFetchNextPageError, fetchNextPage } = feed;

  useEffect(() => {
    if (!ready || !sentinel.current || !hasNextPage || isFetching || isFetchNextPageError) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) void fetchNextPage();
      },
      { rootMargin: '300px' },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [ready, hasNextPage, isFetching, isFetchNextPageError, fetchNextPage]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-3 pb-12 sm:p-6 sm:pb-16">
      <Helmet title="Promo and special cards | SWUBase" />
      <Link
        to="/cards/search"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Card home
      </Link>
      <header className="relative isolate rounded-3xl border border-amber-400/30 bg-slate-950 px-6 py-6 text-white sm:px-8 md:flex md:min-h-60 md:items-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(ellipse_at_top_right,_#92400e90,_transparent_70%)]"
        />
        <div className="relative grid w-full items-center gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-8">
          <div className="max-w-2xl space-y-3">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">
              <Sparkles className="size-4" /> Beyond the ordinary
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Promo and special cards
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
              A closer look at the galaxy’s special printings. Explore promos, rare treatments, and
              collections selected for card lovers.
            </p>
          </div>
          <div className="relative mx-auto -mb-6 w-full max-w-[25rem] md:mb-0 md:h-40">
            <PromoCardFan
              printings={promoArt}
              loading="eager"
              className="md:absolute md:top-1/2 md:-translate-y-1/2"
            />
          </div>
        </div>
      </header>
      {catalog.isPending || feed.isPending ? (
        <p
          role="status"
          className="flex items-center justify-center gap-2 py-12 text-muted-foreground"
        >
          <Loader2 className="size-5 animate-spin" /> Loading collections…
        </p>
      ) : !ready ? (
        <div role="alert" className="rounded-xl border p-6">
          Unable to load the collections.{' '}
          <Button
            variant="link"
            onClick={() => {
              void catalog.refetch();
              void feed.refetch();
            }}
          >
            Retry
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-5">
            <CardGroupSelector
              groups={groupList.data ?? []}
              value={selectedGroupId}
              loading={groupList.isPending}
              error={groupList.isError && !groupList.data}
              onValueChange={selectGroup}
            />
            <CardGalleryListSelect list={list} />
            <div className="ml-auto">
              <CardGalleryDisplaySettings />
            </div>
          </div>
          {groupList.isError && (
            <div role="alert" className="text-sm text-muted-foreground">
              The card group selector couldn’t be {groupList.data ? 'refreshed' : 'loaded'}.{' '}
              <Button variant="link" onClick={() => void groupList.refetch()}>
                Retry group selector
              </Button>
            </div>
          )}
          {selectedGroupId && groupList.isPending && (
            <p role="status" className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading selected group…
            </p>
          )}
          {selectedGroupId && groupList.isSuccess && !selectedGroup && (
            <div role="alert" className="text-sm text-muted-foreground">
              This card group is no longer available. Choose another group or{' '}
              <Button variant="link" onClick={() => selectGroup(undefined)}>
                Clear selection
              </Button>
            </div>
          )}
          {(feed.isRefetchError || catalog.isError) && (
            <div role="alert" className="text-sm text-muted-foreground">
              These collections couldn’t be refreshed.{' '}
              <Button
                variant="link"
                onClick={() => {
                  void catalog.refetch();
                  void feed.refetch();
                }}
              >
                Retry
              </Button>
            </div>
          )}
          {!displayedGroups.length && (
            <div className="rounded-2xl border border-dashed p-10 text-center">
              <Sparkles className="mx-auto mb-4 size-8 text-muted-foreground" />
              <h2 className="text-xl font-semibold">More to discover soon</h2>
              <p className="mt-2 text-muted-foreground">
                New promo and special card collections will appear here.
              </p>
            </div>
          )}
          <div className="space-y-12">
            {displayedGroups.map(group => {
              const printings = resolveCardGroupPrintings(index, group.variantIds);
              return (
                <section
                  key={group.id}
                  aria-labelledby={`group-${group.id}`}
                  className="space-y-5 border-b pb-10 last:border-0"
                >
                  <header className="space-y-2">
                    <h2
                      id={`group-${group.id}`}
                      className="text-2xl font-semibold tracking-tight sm:text-3xl"
                    >
                      <Link
                        to="/cards/groups/$groupId"
                        params={{ groupId: group.id }}
                        className="group inline-flex max-w-full items-center gap-3 rounded-sm hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <span className="break-words [overflow-wrap:anywhere]">{group.title}</span>
                        <ArrowUpRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </Link>
                    </h2>
                    {group.description && (
                      <p className="max-w-3xl whitespace-pre-wrap break-words text-muted-foreground">
                        {group.description}
                      </p>
                    )}
                  </header>
                  {printings.length < group.variantIds.length && (
                    <p role="status" className="text-sm text-muted-foreground">
                      Some versions in this collection are no longer available in the catalog.
                    </p>
                  )}
                  <VariantGallery printings={printings} listEditor={list.editor} />
                </section>
              );
            })}
          </div>
          <div
            ref={sentinel}
            data-testid="card-groups-sentinel"
            className="flex min-h-8 justify-center"
          >
            {feed.isFetchingNextPage && (
              <p role="status" className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading more collections…
              </p>
            )}
            {feed.isFetchNextPageError && (
              <div role="alert" className="text-sm text-muted-foreground">
                More collections couldn’t be loaded.{' '}
                <Button variant="link" onClick={() => void feed.fetchNextPage()}>
                  Retry
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
