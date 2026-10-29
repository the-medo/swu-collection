import { CreatorBackLink } from './creatorNavigation.tsx';
import { CreationDate } from './CreationDate.tsx';
import { ConnectionLink } from './ConnectionLink.tsx';
import { ConnectionContent } from './ConnectionContent.tsx';
import { CreationPublisher } from './CreationPublisher.tsx';
import { ArticleHeader, articleSurface, articleBodyInset } from './ArticleHeader.tsx';
import { LanguageFlag } from './CreatorLanguages.tsx';
import { lazy, Suspense, useRef, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Pencil } from 'lucide-react';
import { useUser } from '@/hooks/useUser.ts';
import { hubApi, creatorKeys, useHubQuery } from '@/api/creators';
import { youtubeVideoId } from '../../../../../shared/creators/youtube.ts';
import type { Creation, CreationDocument } from '../../../../../shared/creators/contracts.ts';
import { creationTagMap } from '../../../../../shared/creators/taxonomy.ts';
import { Status } from './CreatorControls.tsx';
import { CreatorLayout } from './CreatorLayout.tsx';
import { creatorHeading, creatorLink, creatorTitle } from './creatorStyles.ts';
import { CreationVideo, type CreationVideoHandle } from './CreationVideo.tsx';
import { CreationDeckLink } from './CreationDeckLink.tsx';
import { CreationDescription } from './CreationDescription.tsx';
import { ReportCreationButton } from './ReportCreationButton.tsx';
import { cn } from '@/lib/utils.ts';
const PostContent = lazy(() =>
  import('../rich-text-editor/blocknote/PostContent.tsx').then(m => ({
    default: m.PostContent,
  })),
);
function timestamp(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function EditArticleButton({ creation }: { creation: Creation }) {
  const user = useUser();
  const mine = useHubQuery(creatorKeys.mine, hubApi.mine, !!creation.creatorId, true);
  // Personal articles belong to their author. After transfer, creator membership
  // determines access; the retained author attribution does not grant editing.
  const canEdit =
    !!user &&
    (creation.creatorId
      ? mine.data?.some(profile => profile.id === creation.creatorId && !!profile.ownerId)
      : creation.authorId === user.id);
  if (!canEdit) return null;
  return (
    <Button asChild variant="outline" size="sm">
      <Link
        to="/creator-studio"
        search={{ creationId: creation.id, creatorId: creation.creatorId ?? undefined }}
      >
        <Pencil aria-hidden="true" />
        Edit article
      </Link>
    </Button>
  );
}

function CreationTimestamp({
  videoId,
  seconds,
  label,
  unavailable,
  onSeek,
  className,
  children,
}: {
  videoId: string | null;
  seconds: number;
  label: string;
  unavailable: boolean;
  onSeek(): void;
  className: string;
  children: ReactNode;
}) {
  // Keep the same anchor during readiness/failure transitions so keyboard focus
  // stays on the timestamp. Modified clicks can always open the original video.
  if (videoId)
    return (
      <a
        href={`https://www.youtube.com/watch?v=${videoId}&t=${seconds}s`}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        aria-label={`${unavailable ? 'Open on YouTube at' : 'Play from'} ${timestamp(seconds)}: ${label}`}
        onClick={event => {
          if (
            !unavailable &&
            !event.metaKey &&
            !event.ctrlKey &&
            !event.shiftKey &&
            !event.altKey &&
            event.button === 0
          ) {
            event.preventDefault();
            onSeek();
          }
        }}
      >
        {children}
      </a>
    );
  return (
    <button
      type="button"
      disabled={!videoId}
      className={className}
      onClick={onSeek}
      aria-label={`Play from ${timestamp(seconds)}: ${label}`}
    >
      {children}
    </button>
  );
}

export function CreationBody({
  document,
  references,
}: {
  document: CreationDocument;
  references?: Creation['references'];
}) {
  const video = useRef<CreationVideoHandle>(null);
  const [navigationUnavailable, setNavigationUnavailable] = useState(false);
  const videoId = document.medium === 'video' ? youtubeVideoId(document.sourceUrl) : null;
  const videoDecks = videoId ? (references?.filter(ref => ref.type === 'deck') ?? []) : [];
  const subjects = videoId ? references?.filter(ref => ref.type !== 'deck') : references;
  const chapters = document.medium === 'video' ? document.chapters : [];
  const hasResources = chapters.length > 0 || videoDecks.length > 0;
  const hasMedia = document.medium !== 'article';
  return (
    <div className="@container/creation space-y-6">
      {hasMedia && (
        <div
          className={cn(
            'grid grid-cols-1 items-start gap-6',
            videoId && hasResources && '@3xl/creation:grid-cols-[minmax(0,1fr)_18rem]',
          )}
        >
          {document.medium !== 'article' && (
            <div className="min-w-0 space-y-3">
              {videoId && (
                <CreationVideo
                  key={videoId}
                  ref={video}
                  videoId={videoId}
                  title={document.title}
                  enableNavigation={
                    document.chapters.length > 0 ||
                    !!references?.some(ref => ref.startSeconds !== null)
                  }
                  onNavigationUnavailable={setNavigationUnavailable}
                />
              )}
              {navigationUnavailable && (
                <p role="status" className="text-sm text-muted-foreground">
                  Timestamps now open on YouTube. You can still use the video controls here.
                </p>
              )}
              <a
                href={document.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={creatorLink}
              >
                Open original {document.medium === 'audio' ? 'podcast' : 'content'}
              </a>
              {document.medium === 'video' && (document.videoDescription || document.summary) && (
                <CreationDescription text={document.videoDescription || document.summary} />
              )}
            </div>
          )}
          {hasResources && (
            <aside aria-label="Creation resources" className="grid min-w-0 gap-5">
              {videoDecks.length > 0 && (
                <section
                  aria-label="Decklists"
                  className="grid min-w-0 gap-4 rounded-[20px] border border-[var(--creator-border)] bg-[var(--creator-soft)] p-5"
                >
                  <h2 className={creatorHeading}>Decklists</h2>
                  {videoDecks.map((ref, index) => (
                    <div key={`${ref.id}:${index}`} className="grid min-w-0 gap-2">
                      <CreationDeckLink deckId={ref.id} href={ref.href} label={ref.label} />
                      {ref.startSeconds !== null && (
                        <CreationTimestamp
                          videoId={videoId}
                          seconds={ref.startSeconds}
                          label={ref.label}
                          unavailable={navigationUnavailable}
                          className={`${creatorLink} inline-flex min-h-10 items-center justify-self-start`}
                          onSeek={() => video.current?.seekTo(ref.startSeconds!)}
                        >
                          Watch at {timestamp(ref.startSeconds)}
                        </CreationTimestamp>
                      )}
                    </div>
                  ))}
                </section>
              )}
              {chapters.length > 0 && (
                <nav
                  aria-label="Chapters"
                  className="grid min-w-0 gap-4 rounded-[20px] border border-[var(--creator-border)] bg-[var(--creator-soft)] p-5"
                >
                  <h2 className={creatorHeading}>In this creation</h2>
                  <div className={cn('grid gap-0.5', !videoId && 'sm:grid-cols-2')}>
                    {chapters.map(chapter => (
                      <CreationTimestamp
                        key={chapter.startSeconds}
                        videoId={videoId}
                        seconds={chapter.startSeconds}
                        label={chapter.title}
                        unavailable={navigationUnavailable}
                        className={`${creatorLink} flex min-h-6 items-baseline gap-3 rounded px-2 py-0.5 text-left hover:bg-background/60 disabled:text-muted-foreground`}
                        onSeek={() => video.current?.seekTo(chapter.startSeconds)}
                      >
                        <span className="shrink-0 font-mono tabular-nums">
                          {timestamp(chapter.startSeconds)}
                        </span>
                        <span className="min-w-0 break-words">{chapter.title}</span>
                      </CreationTimestamp>
                    ))}
                  </div>
                </nav>
              )}
            </aside>
          )}
        </div>
      )}
      <div
        className={cn(
          document.medium === 'article' && 'rounded-lg bg-background p-3 sm:p-5 lg:p-6',
        )}
      >
        <Suspense fallback={<p>Loading article…</p>}>
          <PostContent content={document.body} type="rich" />
        </Suspense>
      </div>
      {document.medium === 'article' && document.sourceUrl && (
        <p className="text-sm">
          <a
            href={document.sourceUrl}
            className={creatorLink}
            rel="noopener noreferrer"
            target="_blank"
          >
            Originally published here
          </a>
        </p>
      )}
      {!!subjects?.length && (
        <section className="@container/connections grid min-w-0 grid-cols-1 gap-3 border-t pt-6">
          <h2 className={creatorHeading}>Explore the subjects</h2>
          <div className="grid gap-2 @min-[520px]/connections:grid-cols-2 @min-[800px]/connections:grid-cols-3">
            {subjects.map((ref, index) => (
              <div
                key={index}
                className="min-w-0 space-y-2 rounded-xl border border-border bg-card p-2.5"
              >
                <ConnectionLink subject={ref}>
                  <ConnectionContent subject={ref} />
                </ConnectionLink>
                {videoId && ref.startSeconds !== null && (
                  <CreationTimestamp
                    videoId={videoId}
                    seconds={ref.startSeconds}
                    label={ref.label}
                    unavailable={navigationUnavailable}
                    className={`${creatorLink} shrink-0`}
                    onSeek={() => video.current?.seekTo(ref.startSeconds!)}
                  >
                    {timestamp(ref.startSeconds)}
                  </CreationTimestamp>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
export default function CreationPage({ id, returnTo }: { id: string; returnTo?: string }) {
  const query = useHubQuery(creatorKeys.creation(id), () => hubApi.get(id));
  if (!query.data)
    return (
      <CreatorLayout scrollReady={!query.isPending}>
        <Status loading={query.isPending} error={query.error} />
      </CreatorLayout>
    );
  const { document, creator, references, publishedAt, updatedAt, sourceVerified } = query.data;
  const isArticle = document.medium === 'article';
  const publicationDetails = (
    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-[12px]">
      <CreationPublisher creation={query.data} avatar />
      {creator && query.data.author && document.medium === 'article' && (
        <span className="text-muted-foreground">
          Written by{' '}
          <Link
            to="/users/$userId"
            params={{ userId: query.data.author.id }}
            className={creatorLink}
          >
            {query.data.author.name}
          </Link>
        </span>
      )}
      <span className="text-muted-foreground">
        <CreationDate
          publishedAt={publishedAt}
          uploaded={document.medium === 'video' && sourceVerified}
        />
        {' · '}
        <LanguageFlag code={document.language} />
        {publishedAt &&
          updatedAt.slice(0, 10) !== publishedAt.slice(0, 10) &&
          ` · Updated ${new Date(updatedAt).toLocaleDateString()}`}
      </span>
      {document.season && <Badge variant="outline">{document.season}</Badge>}
    </div>
  );
  const hasHeaderDetails = document.tags.length > 0 || document.medium !== 'article';
  return (
    <CreatorLayout fullWidth={document.medium === 'video'}>
      <Helmet
        title={`${document.title} | ${creator?.name ?? query.data.author?.name ?? 'Deleted user'} | SWUBASE`}
      >
        <meta name="description" content={document.summary} />
      </Helmet>
      <div
        className={cn(
          'flex w-full flex-wrap items-center justify-between gap-3',
          isArticle && 'mx-auto max-w-5xl',
        )}
      >
        <CreatorBackLink returnTo={returnTo} />
        {isArticle && <EditArticleButton creation={query.data} />}
      </div>
      <article
        className={cn(
          isArticle
            ? articleSurface
            : '@container/creation-page mx-auto grid w-full min-w-0 grid-cols-1 gap-6 rounded-[20px] border border-border bg-card p-5 sm:p-8 lg:p-10',
          document.medium !== 'video' && 'max-w-5xl',
        )}
      >
        {isArticle ? (
          <ArticleHeader
            coverUrl={document.coverUrl}
            title={document.title}
            summary={document.summary}
            tags={document.tags}
          >
            {publicationDetails}
          </ArticleHeader>
        ) : (
          <header
            className={cn(
              'grid min-w-0 grid-cols-1 items-start gap-x-6 gap-y-4 border-b border-border pb-5',
              hasHeaderDetails && '@3xl/creation-page:grid-cols-[minmax(0,1fr)_18rem]',
            )}
          >
            <div className="grid min-w-0 gap-3">
              <h1 className={creatorTitle}>{document.title}</h1>
              {document.medium !== 'video' && document.summary && (
                <p className="m-0! text-[15px]! leading-[1.8]! break-words text-muted-foreground">
                  {document.summary}
                </p>
              )}
              {publicationDetails}
            </div>
            {hasHeaderDetails && (
              <div className="grid min-w-0 gap-2 text-right">
                {document.tags.length > 0 && (
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {document.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="whitespace-normal">
                        {creationTagMap.get(tag)?.label}
                      </Badge>
                    ))}
                  </div>
                )}
                {document.medium !== 'article' && (
                  <p className="m-0! text-[11px]! leading-[1.6]! text-muted-foreground">
                    {sourceVerified
                      ? 'Imported from this creator’s YouTube channel.'
                      : 'Shared by this creator. Follow the original source for its author and attribution.'}
                  </p>
                )}
                {document.medium === 'video' && (
                  <div className="flex justify-end">
                    <ReportCreationButton id={id} />
                  </div>
                )}
              </div>
            )}
          </header>
        )}
        <div className={cn('grid min-w-0 gap-6', isArticle && articleBodyInset)}>
          {document.freshness === 'historical' && (
            <p className="rounded-xl border border-[var(--creator-border)] bg-[var(--creator-soft)] p-4 text-[12px]! leading-relaxed!">
              Historical content: card availability and rules may have changed since this was
              published.
            </p>
          )}
          {document.sponsorship && (
            <p className="rounded-xl bg-muted p-4 text-[12px]! leading-relaxed!">
              Disclosure: {document.sponsorship}
            </p>
          )}
          <CreationBody
            key={`${id}:${query.data.revision}`}
            document={document}
            references={references}
          />
        </div>
      </article>
    </CreatorLayout>
  );
}
