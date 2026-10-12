import { ListFilter, MessageCircle, MessagesSquare } from 'lucide-react';
import { getRouteApi } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { useDiscussionFeed } from '@/api/discussions/useDiscussionFeed.ts';
import { DiscussionFeedItem } from '@/components/app/discussions/DiscussionFeedItem.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';
import { ForumStartDiscussion } from './ForumStartDiscussion.tsx';
import { ForumCommentItem } from './ForumCommentItem.tsx';
import { cn } from '@/lib/utils.ts';
import type {
  DiscussionFeedKind,
  DiscussionType,
} from '../../../../../shared/types/discussions.ts';

const route = getRouteApi('/forum/');
const typeFilters = [
  { value: 'all', label: 'All' },
  { value: 'forum', label: 'General' },
  { value: 'deck', label: 'Decks' },
  { value: 'card-detail', label: 'Cards' },
  { value: 'daily-pool', label: 'Daily pools' },
] as const;

function ForumTypeFilters() {
  const { forumType } = route.useSearch();
  const navigate = route.useNavigate();
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 border-b border-[color:var(--forum-border)] pb-4">
      <span
        id="forum-type-filter-label"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--forum-accent)]"
      >
        <ListFilter size={15} aria-hidden="true" />
        Filter threads &amp; discussions
      </span>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={forumType ?? 'all'}
        onValueChange={value => {
          const selected = typeFilters.find(filter => filter.value === value);
          if (selected)
            void navigate({
              search: previous => ({
                ...previous,
                forumType: selected.value === 'all' ? undefined : selected.value,
              }),
            });
        }}
        aria-labelledby="forum-type-filter-label"
        className="flex-wrap justify-start gap-1.5"
      >
        {typeFilters.map(filter => (
          <ToggleGroupItem
            key={filter.value}
            value={filter.value}
            className="h-8 rounded-full border-[color:var(--forum-border)] px-3 text-xs hover:bg-[var(--forum-panel)] hover:text-[color:var(--forum-accent)] data-[state=on]:border-[color:var(--forum-accent)] data-[state=on]:bg-[var(--forum-accent)] data-[state=on]:text-[color:var(--forum-contrast)]"
          >
            {filter.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

const feedButtonClasses =
  'border-[color:var(--forum-border)] text-[color:var(--forum-accent)] hover:bg-[var(--forum-panel)] hover:text-[color:var(--forum-accent)]';

function ForumFeed({ kind, type }: { kind: DiscussionFeedKind; type?: DiscussionType }) {
  const query = useDiscussionFeed(kind, type);
  const entries = query.data?.pages.flatMap(page => page.data) ?? [];
  const discussions = kind === 'discussions';
  const Icon = discussions ? MessagesSquare : MessageCircle;
  const title = discussions ? 'Newest threads' : 'Recent discussions';
  const itemLabel = discussions ? 'threads' : 'comments';
  return (
    <section
      aria-labelledby={`forum-${kind}-title`}
      className="min-w-0 self-start rounded-[20px] border border-[color:var(--forum-border)] bg-card p-5 sm:p-6"
    >
      <header className="mb-2">
        <h2
          id={`forum-${kind}-title`}
          className="m-0! flex items-center gap-2 border-0! p-0! text-lg! font-semibold! text-[color:var(--forum-accent)]"
        >
          <Icon size={20} className="shrink-0" aria-hidden="true" />
          {title}
        </h2>
        {discussions ? (
          <ForumTypeFilters />
        ) : (
          <p className="mb-0! mt-2! text-xs! leading-relaxed! text-muted-foreground">
            The newest comments and replies from the community.
          </p>
        )}
      </header>
      {query.isPending ? (
        <div role="status" aria-label={`Loading ${itemLabel}`} className="mt-5 grid gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className={cn('rounded-lg', discussions ? 'h-24' : 'h-16')} />
          ))}
        </div>
      ) : query.isError && !query.data ? (
        <div role="alert" className="mt-5 space-y-3 text-sm text-muted-foreground">
          <p>{title} couldn’t be loaded.</p>
          <Button
            variant="outline"
            size="sm"
            className={feedButtonClasses}
            onClick={() => void query.refetch()}
          >
            Retry {itemLabel}
          </Button>
        </div>
      ) : entries.length === 0 ? (
        <p className="mt-6! text-sm! text-muted-foreground">
          {type
            ? `No ${itemLabel} of this type yet.`
            : discussions
              ? 'No threads yet. Start a new conversation.'
              : 'No comments yet. Join a discussion to get things started.'}
        </p>
      ) : (
        <>
          <ul className="m-0! list-none! divide-y divide-[var(--forum-border)] p-0!">
            {entries.map(entry => (
              <li key={entry.id} className="m-0! p-0!">
                {discussions ? (
                  <DiscussionFeedItem entry={entry} />
                ) : (
                  <ForumCommentItem entry={entry} />
                )}
              </li>
            ))}
          </ul>
          {query.isError && (
            <div role="alert" className="my-3 text-sm text-muted-foreground">
              <p>
                Couldn’t load {query.isFetchNextPageError ? 'more' : 'the latest'} {itemLabel}.
              </p>
              <Button
                variant="outline"
                size="sm"
                className={feedButtonClasses}
                onClick={() =>
                  void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())
                }
              >
                Retry {itemLabel}
              </Button>
            </div>
          )}
          {query.hasNextPage && !query.isFetchNextPageError && (
            <Button
              variant="outline"
              className={cn('mt-3 w-full', feedButtonClasses)}
              disabled={query.isFetching}
              onClick={() => void query.fetchNextPage()}
            >
              {query.isFetchingNextPage ? 'Loading…' : `Load more ${itemLabel}`}
            </Button>
          )}
        </>
      )}
    </section>
  );
}

export default function ForumPage() {
  const { forumType } = route.useSearch();
  return (
    <div
      className={cn(
        'forum-page mx-auto w-full max-w-[1600px] px-2 py-6 sm:px-6',
        '[--forum-accent:#326149] [--forum-panel:#eef2e9] [--forum-border:#d9e1d2] [--forum-contrast:#fff]',
        'dark:[--forum-accent:#b9d4a8] dark:[--forum-panel:#1d2720] dark:[--forum-border:#364437] dark:[--forum-contrast:#1d2720]',
        '[--discussion-accent:var(--forum-accent)] [&_button:focus-visible]:ring-[var(--forum-accent)]',
      )}
    >
      <Helmet title="Forum | SWUBase" />
      <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="@container min-w-0 space-y-6">
          <div className="grid items-start gap-6 @3xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <header>
              <h1 className="mb-2! text-3xl! font-semibold! tracking-tight text-[color:var(--forum-accent)]">
                Forum
              </h1>
              <p className="m-0! text-sm! leading-relaxed! text-muted-foreground">
                Share ideas, ask questions, and see what the community is talking about.
              </p>
            </header>
            <ForumStartDiscussion />
          </div>
          <ForumFeed kind="discussions" type={forumType} />
        </div>
        <ForumFeed kind="comments" type={forumType} />
      </div>
    </div>
  );
}
