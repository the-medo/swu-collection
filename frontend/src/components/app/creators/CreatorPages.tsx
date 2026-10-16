import { LanguageFilter, LanguageFlag } from './CreatorLanguages.tsx';
import { lazy, Suspense, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { hubApi, creatorKeys, useHubQuery } from '@/api/creators';
import { CreationCards } from './CreationCards.tsx';
import { Status, Field, TagPicker, selectClass } from './CreatorControls.tsx';
import { creationTagMap } from '../../../../../shared/creators/taxonomy.ts';
import { CreatorAvatar, CreatorHeader, CreatorLayout } from './CreatorLayout.tsx';
import { CreatorLinkButton } from './CreatorLinkButton.tsx';
import {
  creatorDescription,
  creatorEmpty,
  creatorHeading,
  creatorLink,
  creatorPagination,
  creatorPanel,
  creatorSubheading,
  creatorTitle,
} from './creatorStyles.ts';
const PostContent = lazy(() =>
  import('../rich-text-editor/blocknote/PostContent.tsx').then(m => ({
    default: m.PostContent,
  })),
);

export function CreatorDirectory() {
  const [q, setQ] = useState(''),
    [page, setPage] = useState(1),
    [language, setLanguage] = useState(''),
    [tags, setTags] = useState<string[]>([]);
  const query = useHubQuery(
    creatorKeys.directory(q, page, language, tags),
    () => hubApi.creators(q, page, language || undefined, tags.join(',') || undefined),
    true,
    false,
    { keepPreviousData: true },
  );
  return (
    <CreatorLayout>
      <Helmet title="Creators | SWUBASE" />
      <CreatorHeader
        eyebrow="The SWU community"
        title="Find your next favorite creator"
        description="Writers, players, analysts and storytellers. Every perspective has a home."
      >
        <Button asChild className="rounded-lg">
          <Link to="/creator-studio">
            Join as a creator <ArrowRight size={15} />
          </Link>
        </Button>
      </CreatorHeader>
      <section className={`${creatorPanel} space-y-4`} aria-label="Find creators">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className={creatorHeading}>Meet the community</h2>
          <div className="w-full sm:max-w-sm">
            <Input
              icon={Search}
              className="rounded-lg"
              aria-label="Find a creator"
              placeholder="Search creators…"
              value={q}
              onChange={e => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        <details className="border-t border-border pt-4">
          <summary className="cursor-pointer text-[12px] font-medium text-[var(--creator-accent)]">
            Languages and specialties
          </summary>
          <div className="mt-4 space-y-3">
            <LanguageFilter
              available={query.data?.languages ?? []}
              value={language || undefined}
              onChange={value => {
                setLanguage(value ?? '');
                setPage(1);
              }}
            />
            <TagPicker
              selected={tags}
              onChange={value => {
                setTags(value);
                setPage(1);
              }}
              dimensions={['purpose', 'format', 'audience']}
              compact
            />
          </div>
        </details>
      </section>
      <Status loading={query.isPending} error={query.error} />
      {query.data?.items.length === 0 && (
        <div className={creatorEmpty}>
          <Users className="mx-auto mb-4 size-8 text-[var(--creator-accent)]" />
          <p className={creatorDescription}>
            {q || language || tags.length
              ? 'No creators match these filters yet. Try another name, language or specialty.'
              : 'Be one of the first creators to make this your home.'}
          </p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {query.data?.items.map(profile => (
          <Link
            key={profile.id}
            to="/creators/$slug"
            params={{ slug: profile.slug }}
            className="group flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-border bg-card transition-colors hover:border-[var(--creator-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div className="h-28 bg-gradient-to-br from-[#17352e] via-[#2f5140] to-[#71866b]">
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
            <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
              <CreatorAvatar name={profile.name} src={profile.avatarUrl} className="-mt-14" />
              <h2 className={creatorHeading}>{profile.name}</h2>
              {profile.tagline && (
                <p className={`${creatorDescription} line-clamp-3`}>{profile.tagline}</p>
              )}
              <div className="flex flex-wrap gap-1">
                {profile.languages.map(language => (
                  <Badge key={language} variant="outline">
                    <LanguageFlag code={language} />
                  </Badge>
                ))}
                {profile.specialties.slice(0, 3).map(id => (
                  <Badge key={id} variant="secondary">
                    {creationTagMap.get(id)?.label}
                  </Badge>
                ))}
              </div>
              <span className="mt-auto flex items-center gap-2 pt-3 text-[11px] font-medium text-[var(--creator-accent)]">
                Explore creator{' '}
                <ArrowRight
                  size={14}
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                />
              </span>
            </div>
          </Link>
        ))}
      </div>
      <div className={creatorPagination}>
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
          Previous
        </Button>
        <span className="text-[12px] text-muted-foreground">Page {page}</span>
        <Button
          variant="outline"
          disabled={!query.data?.hasMore}
          onClick={() => setPage(p => p + 1)}
        >
          Next
        </Button>
      </div>
    </CreatorLayout>
  );
}
export function CreatorPage({ slug }: { slug: string }) {
  const query = useHubQuery(creatorKeys.profile(slug), () => hubApi.profile(slug));
  const [tab, setTab] = useState('all'),
    [page, setPage] = useState(1),
    [selectedSeries, setSelectedSeries] = useState(''),
    [language, setLanguage] = useState<string | undefined>();
  const profile = query.data;
  const content = useHubQuery(
    creatorKeys.discovery({
      creatorId: profile?.id,
      page,
      language,
      series: tab === 'series' ? selectedSeries || undefined : undefined,
      tags: ['video', 'article', 'audio'].includes(tab) ? `medium:${tab}` : undefined,
    }),
    () =>
      hubApi.discover({
        creatorId: profile!.id,
        page,
        language,
        series: tab === 'series' ? selectedSeries || undefined : undefined,
        tags: ['video', 'article', 'audio'].includes(tab) ? `medium:${tab}` : undefined,
      }),
    !!profile && !['about', 'decks'].includes(tab) && (tab !== 'series' || !!selectedSeries),
    false,
    { keepPreviousData: true },
  );
  const collections = useHubQuery(
    creatorKeys.collections(profile?.id),
    () => hubApi.collections(profile!.id),
    !!profile,
  );
  if (!profile)
    return (
      <CreatorLayout>
        <Status error={query.error} loading={query.isPending} />
      </CreatorLayout>
    );
  const items = content.data?.items ?? [];
  const ordered = [...items].sort((a, b) => Number(b.document.pinned) - Number(a.document.pinned));
  const series = collections.data?.series ?? [];
  const decks = collections.data?.decks ?? [];
  const hasLinks = profile.youtube.length > 0 || profile.links.length > 0;
  return (
    <CreatorLayout>
      <Helmet title={`${profile.name} | SWUBASE`} />
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
                <h1 className={`${creatorTitle} min-w-0 flex-1`}>{profile.name}</h1>
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
      {profile.introduction && (
        <section className="grid gap-3 rounded-[20px] border border-[var(--creator-border)] bg-[var(--creator-soft)] p-5 sm:p-6">
          <h2 className={creatorHeading}>Start here</h2>
          <p className="m-0! max-w-3xl whitespace-pre-wrap break-words text-[13px]! leading-[1.8]!">
            {profile.introduction}
          </p>
        </section>
      )}
      <div
        className="flex gap-1 overflow-x-auto rounded-[20px] border border-border bg-card p-2"
        role="tablist"
        aria-label="Creator content"
      >
        {[
          ['all', 'All content'],
          ['video', 'Videos'],
          ['article', 'Articles'],
          ['audio', 'Podcasts'],
          ['decks', 'Decks'],
          ['series', 'Series'],
          ['about', 'About'],
        ].map(([value, label]) => (
          <Button
            key={value}
            role="tab"
            aria-selected={tab === value}
            className={
              tab === value
                ? 'shrink-0 rounded-xl border border-[var(--creator-border)] bg-[var(--creator-soft)] text-[var(--creator-accent)] hover:bg-[var(--creator-soft)]'
                : 'shrink-0 rounded-xl text-muted-foreground'
            }
            variant={tab === value ? 'default' : 'ghost'}
            onClick={() => {
              setTab(value);
              setLanguage(undefined);
              setPage(1);
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      {!['about', 'decks'].includes(tab) && (tab !== 'series' || selectedSeries) && (
        <LanguageFilter
          available={content.data?.languages ?? []}
          value={language}
          onChange={value => {
            setLanguage(value);
            setPage(1);
          }}
        />
      )}
      {tab === 'about' ? (
        <section className={creatorPanel}>
          <h2 className={`${creatorSubheading} mb-4!`}>About {profile.name}</h2>
          <Suspense fallback={<Status loading />}>
            <PostContent key={profile.revision} type="simple" content={profile.bio} />
          </Suspense>
        </section>
      ) : (
        <>
          <Status
            loading={['decks', 'series'].includes(tab) ? collections.isPending : content.isPending}
            error={
              ['decks', 'series'].includes(tab)
                ? (collections.error ?? content.error)
                : content.error
            }
          />
          {collections.data?.hasMore && ['decks', 'series'].includes(tab) && (
            <p className="text-sm text-muted-foreground">
              Showing the first 200 series and linked decks. Explore all content for more.
            </p>
          )}
          {tab === 'decks' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {decks.map(d => (
                <a
                  key={d.id}
                  href={d.href}
                  className={`${creatorPanel} flex items-center justify-between gap-3 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  {d.label}
                  <ArrowRight
                    size={16}
                    aria-hidden="true"
                    className="shrink-0 text-[var(--creator-accent)]"
                  />
                </a>
              ))}
              {!decks.length && <p className="text-muted-foreground">No linked decks yet.</p>}
            </div>
          ) : tab === 'series' ? (
            <div className="space-y-4">
              <Field label="Series">
                <select
                  className={selectClass}
                  value={selectedSeries}
                  onChange={e => {
                    setSelectedSeries(e.target.value);
                    setLanguage(undefined);
                    setPage(1);
                  }}
                >
                  <option value="">Choose a series</option>
                  {series.map(name => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </Field>
              {selectedSeries && <CreationCards items={items} />}
              {!series.length && <p className="text-muted-foreground">No series yet.</p>}
            </div>
          ) : (
            <CreationCards items={ordered} />
          )}
          {!items.length && !content.isPending && !['decks', 'series'].includes(tab) && (
            <p className={`${creatorEmpty} text-[13px]!`}>New creations will appear here.</p>
          )}
          {tab !== 'decks' && (tab !== 'series' || selectedSeries) && (
            <div className={creatorPagination}>
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={!content.data?.hasMore}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </CreatorLayout>
  );
}
