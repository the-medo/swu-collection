import { useUser } from '@/hooks/useUser.ts';
import { ClaimedBadge, YoutubeClaimButton } from './YoutubeClaim.tsx';
import { lazy, Suspense } from 'react';
import { Link } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { BadgeCheck, Search } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { cn } from '@/lib/utils.ts';
import { hubApi, creatorKeys, useHubQuery } from '@/api/creators';
import { useCreatorFeed } from '@/api/creators/useCreatorFeed.ts';
import { LanguageFilter, LanguageFlag } from './CreatorLanguages.tsx';
import { CreationCards } from './CreationCards.tsx';
import { CreatorDecks } from './CreatorDecks.tsx';
import { CreatorLoadMore } from './CreatorLoadMore.tsx';
import { CreatorTagFilter } from './CreatorTagFilter.tsx';
import { Status, Field, selectClass } from './CreatorControls.tsx';
import { creationTagMap, normalizeTagIds } from '../../../../../shared/creators/taxonomy.ts';
import { CreatorAvatar, CreatorLayout } from './CreatorLayout.tsx';
import { CreatorLinkButton } from './CreatorLinkButton.tsx';
import { creatorTabs, type CreatorTab, type CreatorPageSearch } from './creatorPageSearch.ts';
import {
  creatorDescription,
  creatorEmpty,
  creatorHeading,
  creatorLink,
  creatorPanel,
  creatorSubheading,
  creatorTitle,
} from './creatorStyles.ts';
const PostContent = lazy(() =>
  import('../rich-text-editor/blocknote/PostContent.tsx').then(m => ({
    default: m.PostContent,
  })),
);

export function CreatorPage({
  slug,
  tab = 'all',
  search,
  onChange,
}: {
  slug: string;
  tab?: CreatorTab;
  search: CreatorPageSearch;
  onChange: (patch: Partial<CreatorPageSearch>) => void;
}) {
  const user = useUser();
  const query = useHubQuery(creatorKeys.profile(slug), () => hubApi.profile(slug));
  const profile = query.data;
  const counts = useHubQuery(
    creatorKeys.sectionCounts(profile?.id),
    () => hubApi.sectionCounts(profile!.id),
    !!profile,
  );
  const medium =
    tab === 'videos'
      ? 'video'
      : tab === 'articles'
        ? 'article'
        : tab === 'podcasts'
          ? 'audio'
          : undefined;
  const selectedTags = normalizeTagIds(search.tags?.split(',').filter(Boolean) ?? []).filter(
    id => creationTagMap.has(id) && !id.startsWith('medium:'),
  );
  const showContent = !['about', 'decks'].includes(tab) && (tab !== 'series' || !!search.series);
  const content = useCreatorFeed(
    {
      creatorId: profile?.id,
      language: search.language,
      q: search.q,
      series: tab === 'series' ? search.series : undefined,
      tags: [...(medium ? [`medium:${medium}`] : []), ...selectedTags].join(',') || undefined,
    },
    !!profile && showContent,
  );
  const collections = useHubQuery(
    creatorKeys.collections(profile?.id),
    () => hubApi.collections(profile!.id),
    !!profile && tab === 'series',
  );
  if (!profile)
    return (
      <CreatorLayout>
        <Status error={query.error} loading={query.isPending} />
      </CreatorLayout>
    );
  const items = [
    ...new Map(
      content.data?.pages.flatMap(page => page.items).map(item => [item.id, item]) ?? [],
    ).values(),
  ];
  const facets = content.data?.pages[0];
  const series = collections.data?.series ?? [];
  const filtered = !!(search.q || search.language || selectedTags.length);
  const clearFilters = () => onChange({ q: undefined, language: undefined, tags: undefined });
  const hasLinks = profile.youtube.length > 0 || profile.links.length > 0;
  return (
    <CreatorLayout>
      <Helmet
        title={`${creatorTabs.find(item => item.value === tab)?.label} · ${profile.name} | SWUBASE`}
      />
      <Link to="/creators" className={`${creatorLink} inline-flex items-center gap-2`}>
        ← Meet the creators
      </Link>
      <header className="overflow-hidden rounded-[20px] border border-border bg-card">
        <div className="h-36 bg-gradient-to-br from-[#17352e] via-[#2f5140] to-[#71866b] sm:h-48">
          {profile.bannerUrl && (
            <img
              referrerPolicy="no-referrer"
              loading="lazy"
              src={profile.bannerUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="@container p-5 sm:p-8">
          <div
            className={`grid items-start gap-5 sm:gap-6 ${hasLinks ? '@3xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]' : ''}`}
          >
            <div className="grid min-w-0 gap-4">
              <div className="flex min-w-0 items-start gap-4 sm:gap-6">
                <CreatorAvatar
                  name={profile.name}
                  src={profile.avatarUrl}
                  className="-mt-12 size-20 rounded-[20px] text-2xl sm:-mt-16 sm:size-24 sm:rounded-[24px] sm:text-3xl"
                />
                <div className="grid min-w-0 flex-1 gap-2">
                  <h1 className={creatorTitle}>{profile.name}</h1>
                  {profile.ownerId && <ClaimedBadge />}
                </div>
              </div>
              {profile.tagline && (
                <p className={`${creatorDescription} max-w-2xl`}>{profile.tagline}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {profile.specialties.map(id => (
                  <Badge key={id} variant="secondary">
                    {creationTagMap.get(id)?.label}
                  </Badge>
                ))}
                {profile.languages.map(l => (
                  <Badge key={l} variant="outline">
                    <LanguageFlag code={l} />
                  </Badge>
                ))}
              </div>
            </div>
            {hasLinks && (
              <div
                className="flex min-w-0 flex-wrap gap-2 @3xl:justify-end"
                role="group"
                aria-label="Creator links"
              >
                {profile.youtube.map(y => (
                  <CreatorLinkButton
                    key={y.channelId}
                    url={`https://www.youtube.com/channel/${y.channelId}`}
                    label={y.title}
                    kind="social"
                    verified
                  />
                ))}
                {profile.links.map((link, i) => (
                  <CreatorLinkButton key={i} {...link} />
                ))}
              </div>
            )}
          </div>
        </div>
      </header>
      {user && !profile.ownerId && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--creator-border)] bg-[var(--creator-soft)] px-4 py-3">
          <div className="flex min-w-0 max-w-3xl flex-1 basis-72 items-start gap-2.5">
            <BadgeCheck
              size={18}
              className="mt-0.5 shrink-0 text-[var(--creator-accent)]"
              aria-hidden="true"
            />
            <div className="grid min-w-0 gap-1">
              <h2 className={creatorSubheading}>Is this your channel?</h2>
              <p className={cn(creatorDescription, 'text-foreground/80')}>
                Connect YouTube to claim this profile and manage your content. Decklists imported
                for your videos will move to your account as unlisted decks.
              </p>
            </div>
          </div>
          <YoutubeClaimButton creatorId={profile.id}>Claim this profile</YoutubeClaimButton>
        </section>
      )}
      {profile.introduction && (
        <section className="grid gap-3 rounded-[20px] border border-[var(--creator-border)] bg-[var(--creator-soft)] p-5 sm:p-6">
          <h2 className={creatorHeading}>Start here</h2>
          <p className="m-0! max-w-3xl whitespace-pre-wrap break-words text-[13px]! leading-[1.8]!">
            {profile.introduction}
          </p>
        </section>
      )}
      <nav
        className="flex gap-1 overflow-x-auto rounded-[20px] border border-border bg-card p-2"
        aria-label="Creator content"
      >
        {creatorTabs.map(({ value, label }) => {
          const count = value === 'all' || value === 'about' ? undefined : counts.data?.[value];
          // Keep direct links to empty sections usable and retain navigation if counts fail.
          if (
            value !== tab &&
            (count === 0 || (counts.isPending && value !== 'all' && value !== 'about'))
          )
            return null;
          return (
            <Button
              key={value}
              asChild
              variant="ghost"
              className={
                tab === value
                  ? 'shrink-0 rounded-xl border border-[var(--creator-border)] bg-[var(--creator-soft)] text-[var(--creator-accent)] hover:bg-[var(--creator-soft)]'
                  : 'shrink-0 rounded-xl text-muted-foreground'
              }
            >
              {value === 'all' ? (
                <Link
                  to="/creators/$slug"
                  params={{ slug }}
                  search={previous => ({ ...previous, series: undefined })}
                  resetScroll={false}
                  aria-current={tab === value ? 'page' : undefined}
                >
                  {label}
                </Link>
              ) : (
                <Link
                  to="/creators/$slug/$tab"
                  params={{ slug, tab: value }}
                  search={previous => ({
                    ...previous,
                    series: value === 'series' ? search.series : undefined,
                  })}
                  resetScroll={false}
                  aria-current={tab === value ? 'page' : undefined}
                >
                  {label}
                  {count === undefined ? '' : ` (${count})`}
                </Link>
              )}
            </Button>
          );
        })}
      </nav>
      {tab === 'about' ? (
        <section className={creatorPanel}>
          <h2 className={`${creatorSubheading} mb-4!`}>About {profile.name}</h2>
          <Suspense fallback={<Status loading />}>
            <PostContent key={profile.revision} type="simple" content={profile.bio} />
          </Suspense>
        </section>
      ) : tab === 'decks' ? (
        <CreatorDecks key={profile.id} creatorId={profile.id} />
      ) : (
        <>
          {tab === 'series' && (
            <section className={`${creatorPanel} space-y-3`}>
              <Status loading={collections.isPending} error={collections.error} />
              <Field label="Series">
                <select
                  className={selectClass}
                  value={search.series ?? ''}
                  onChange={e => onChange({ series: e.target.value || undefined })}
                >
                  <option value="">Choose a series</option>
                  {search.series && !series.includes(search.series) && (
                    <option>{search.series}</option>
                  )}
                  {series.map(name => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </Field>
              {collections.data && !series.length && (
                <p className="text-sm text-muted-foreground">No series yet.</p>
              )}
              {collections.data?.hasMore && series.length === 200 && (
                <p className="text-sm text-muted-foreground">
                  Showing up to 200 series. Search all content for more.
                </p>
              )}
            </section>
          )}
          {showContent && (
            <>
              <section
                className={cn(creatorPanel, 'space-y-2 p-3 sm:p-3')}
                aria-label="Filter creator content"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <form
                    className="relative w-64 max-w-full shrink-0"
                    onSubmit={event => {
                      event.preventDefault();
                      onChange({
                        q:
                          String(new FormData(event.currentTarget).get('q') ?? '').trim() ||
                          undefined,
                      });
                    }}
                  >
                    <Input
                      key={`${slug}-${search.q ?? ''}`}
                      name="q"
                      aria-label="Search this creator"
                      placeholder="Search content…"
                      defaultValue={search.q ?? ''}
                      maxLength={120}
                      className="h-8 pl-3 pr-9"
                    />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0.5 top-0.5 h-7 w-7"
                      aria-label="Search"
                    >
                      <Search size={16} />
                    </Button>
                  </form>
                  <LanguageFilter
                    compact
                    available={facets?.languages ?? []}
                    value={search.language}
                    onChange={language => onChange({ language })}
                  />
                  {filtered && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
                <CreatorTagFilter
                  counts={facets?.tagCounts ?? []}
                  selected={selectedTags}
                  onChange={tags => onChange({ tags: tags.join(',') || undefined })}
                />
              </section>
              <Status
                loading={content.isPending}
                error={!content.isFetchNextPageError ? content.error : null}
              />
              {content.isError && !content.data && (
                <Button variant="outline" onClick={() => void content.refetch()}>
                  Try again
                </Button>
              )}
              <span role="status" aria-label="Creator content update" className="sr-only">
                {content.isPlaceholderData ? 'Updating content…' : ''}
              </span>
              <section
                aria-label="Creator publications"
                aria-busy={content.isPlaceholderData}
                className={cn('flex flex-col gap-5', content.isPlaceholderData && 'opacity-60')}
              >
                {content.data && !items.length && (
                  <div className={creatorEmpty}>
                    <p className="text-sm">
                      {content.isPlaceholderData
                        ? 'Updating content…'
                        : filtered
                          ? 'No publications match these filters.'
                          : 'New creations will appear here.'}
                    </p>
                    {filtered && (
                      <Button variant="outline" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    )}
                  </div>
                )}
                <CreationCards items={items} />
              </section>
              {content.data && (
                <CreatorLoadMore
                  hasMore={content.hasNextPage}
                  loading={content.isFetching}
                  error={content.isFetchNextPageError}
                  onLoad={() => void content.fetchNextPage()}
                  label="content"
                />
              )}
            </>
          )}
        </>
      )}
    </CreatorLayout>
  );
}
