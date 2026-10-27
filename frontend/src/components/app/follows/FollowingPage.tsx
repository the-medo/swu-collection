import { Link, getRouteApi } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, ArrowUpRight, Heart, LockKeyhole, Users } from 'lucide-react';
import { useFollowStatuses, useFollowing } from '@/api/follows';
import { Button } from '@/components/ui/button.tsx';
import {
  CreatorAvatar,
  CreatorHeader,
  CreatorLayout,
} from '@/components/app/creators/CreatorLayout.tsx';
import {
  creatorDescription,
  creatorHeading,
  creatorLink,
  creatorPagination,
  creatorSelectedControl,
  creatorSubheading,
} from '@/components/app/creators/creatorStyles.ts';
import { FollowButton } from './FollowButton.tsx';

const route = getRouteApi('/_authenticated/following');
export function FollowingPage() {
  const { kind, page } = route.useSearch();
  const navigate = route.useNavigate();
  const query = useFollowing(kind, page);
  const statuses = useFollowStatuses(kind, query.data?.items.map(item => item.id) ?? []);
  return (
    <CreatorLayout>
      <Helmet title="Following | SWUBASE" />
      <CreatorHeader
        eyebrow="Your community"
        title="Following"
        description="Keep your favorite creators and players close. Catch up on their latest work and make room for new perspectives."
      >
        <Button asChild size="sm" className="rounded-lg">
          <Link to="/content" search={{ following: true }}>
            Content from follows <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="rounded-lg border-white/25 bg-transparent text-[#fffaf0] hover:bg-white/10 hover:text-[#fffaf0]"
        >
          <Link to="/decks/public" search={{ deckFollowing: true }}>
            Decks from follows
          </Link>
        </Button>
      </CreatorHeader>
      <section className="grid gap-5 rounded-[20px] border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-2">
            <h2 className={creatorHeading}>People you follow</h2>
            <p className={`${creatorDescription} flex items-center gap-1.5`}>
              <LockKeyhole size={13} aria-hidden="true" /> Only you can see this list.
            </p>
          </div>
          <Link to="/creators" className={`${creatorLink} flex items-center gap-1.5 py-1`}>
            Explore creators <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <div
          className="flex w-fit gap-1 rounded-xl border border-[var(--creator-border)] bg-[var(--creator-soft)] p-1"
          role="group"
          aria-label="Following type"
        >
          {(['creators', 'users'] as const).map(value => (
            <Button
              key={value}
              variant="ghost"
              size="sm"
              className={
                kind === value
                  ? 'rounded-lg bg-card text-[var(--creator-accent)] shadow-sm hover:bg-card'
                  : 'rounded-lg text-muted-foreground'
              }
              aria-pressed={kind === value}
              onClick={() =>
                void navigate({ search: previous => ({ ...previous, kind: value, page: 1 }) })
              }
            >
              {value === 'creators' ? (
                <Heart size={14} aria-hidden="true" />
              ) : (
                <Users size={14} aria-hidden="true" />
              )}
              {value === 'users' ? 'Users' : 'Creators'}
            </Button>
          ))}
        </div>
      </section>
      {query.isPending && <p role="status">Loading follows…</p>}
      {query.error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-destructive/30 bg-card p-5 text-sm"
        >
          <p>{query.error.message}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      )}
      {query.data?.items.length === 0 && (
        <div className="grid justify-items-center gap-4 rounded-[20px] border border-dashed border-[var(--creator-border)] bg-card px-6 py-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--creator-soft)]">
            <Heart className="size-6 text-[var(--creator-accent)]" aria-hidden="true" />
          </div>
          <h2 className={creatorSubheading}>
            {page > 1
              ? 'There are no more follows on this page.'
              : `You are not following any ${kind} yet.`}
          </h2>
          <p className={creatorDescription}>
            Use Follow on a user or creator profile to add them here.
          </p>
          <Button asChild variant="outline" className={creatorSelectedControl}>
            <Link to={kind === 'creators' ? '/creators' : '/decks/public'}>
              {kind === 'creators' ? 'Explore creators' : 'Discover players through their decks'}
            </Link>
          </Button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        {query.data?.items.map(item => (
          <article
            key={item.id}
            className="flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-border bg-card transition-colors hover:border-[var(--creator-border)]"
          >
            <Link
              {...(kind === 'creators' && item.slug
                ? { to: '/creators/$slug' as const, params: { slug: item.slug } }
                : { to: '/users/$userId' as const, params: { userId: item.id } })}
              aria-label={item.name}
              className="group flex min-w-0 flex-1 items-center gap-4 p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <CreatorAvatar
                name={item.name}
                src={item.image}
                className="size-14 rounded-2xl border-0"
              />
              <div className="grid min-w-0 flex-1 gap-1.5">
                <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  {kind === 'creators' ? 'Creator' : 'Community player'}
                </span>
                <h3 className={`${creatorSubheading} group-hover:text-[var(--creator-accent)]`}>
                  {item.name}
                </h3>
              </div>
              <ArrowUpRight
                size={16}
                className="shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </Link>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
              <span className="text-[11px] text-muted-foreground">
                Since{' '}
                {new Date(item.followedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              <FollowButton
                kind={kind}
                id={item.id}
                name={item.name}
                status={statuses.data?.[item.id]}
                loading={statuses.isPending}
                error={statuses.error}
                onRetry={() => void statuses.refetch()}
              />
            </div>
          </article>
        ))}
      </div>
      <div className={creatorPagination}>
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => void navigate({ search: previous => ({ ...previous, page: page - 1 }) })}
        >
          Previous
        </Button>
        <span className="text-[12px] text-muted-foreground">Page {page}</span>
        <Button
          variant="outline"
          disabled={!query.data?.hasMore || page >= 1000}
          onClick={() => void navigate({ search: previous => ({ ...previous, page: page + 1 }) })}
        >
          Next
        </Button>
      </div>
    </CreatorLayout>
  );
}
