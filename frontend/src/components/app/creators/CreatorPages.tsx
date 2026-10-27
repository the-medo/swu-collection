import { ClaimedBadge } from './YoutubeClaim.tsx';
import { LanguageFilter, LanguageFlag } from './CreatorLanguages.tsx';
import { useState } from 'react';
import { useFollowStatuses } from '@/api/follows';
import { FollowButton } from '@/components/app/follows/FollowButton.tsx';
import { Link } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { hubApi, creatorKeys, useHubQuery } from '@/api/creators';
import { Status, TagPicker } from './CreatorControls.tsx';
import { creationTagMap } from '../../../../../shared/creators/taxonomy.ts';
import { CreatorAvatar, CreatorHeader, CreatorLayout } from './CreatorLayout.tsx';
import {
  creatorDescription,
  creatorEmpty,
  creatorHeading,
  creatorPagination,
  creatorPanel,
} from './creatorStyles.ts';
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
  const follows = useFollowStatuses('creators', query.data?.items.map(profile => profile.id) ?? []);
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
          <article
            key={profile.id}
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
            <div className="flex flex-1 flex-col gap-3 p-5 pt-2 sm:p-6 sm:pt-2">
              <div className="flex items-start justify-between gap-3">
                <CreatorAvatar name={profile.name} src={profile.avatarUrl} className="-mt-10" />
                <div className="min-w-0 max-w-[60%] text-right">
                  <FollowButton
                    kind="creators"
                    id={profile.id}
                    name={profile.name}
                    status={follows.data?.[profile.id]}
                    loading={follows.isPending}
                    error={follows.error}
                    onRetry={() => void follows.refetch()}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className={creatorHeading}>
                  <Link to="/creators/$slug" params={{ slug: profile.slug }}>
                    {profile.name}
                  </Link>
                </h2>
                {profile.languages.map(language => (
                  <LanguageFlag key={language} code={language} />
                ))}
                {profile.ownerId && <ClaimedBadge />}
              </div>
              {profile.tagline && (
                <p className={`${creatorDescription} line-clamp-3`}>{profile.tagline}</p>
              )}
              {profile.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {profile.specialties.slice(0, 3).map(id => (
                    <Badge key={id} variant="secondary">
                      {creationTagMap.get(id)?.label}
                    </Badge>
                  ))}
                </div>
              )}
              <Link
                to="/creators/$slug"
                params={{ slug: profile.slug }}
                className="mt-auto flex items-center gap-2 pt-3 text-[11px] font-medium text-[var(--creator-accent)]"
              >
                Explore creator{' '}
                <ArrowRight
                  size={14}
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                />
              </Link>
            </div>
          </article>
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
