import { useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { ArrowUpRight, BookOpen, Images } from 'lucide-react';
import { useGetTournament } from '@/api/tournaments/useGetTournament.ts';
import { useCreatorFeed } from '@/api/creators/useCreatorFeed.ts';
import { useTournamentAlbums } from '@/api/user-albums/useTournamentAlbums.ts';
import { albumAccessLost } from '@/api/user-albums/client.ts';
import { CreationCards } from '@/components/app/creators/CreationCards.tsx';
import {
  creatorDescription,
  creatorEmpty,
  creatorHeading,
  creatorLink,
  creatorTheme,
} from '@/components/app/creators/creatorStyles.ts';
import { albumTheme } from '@/components/app/user-albums/albumStyles.ts';
import { useAlbumLoadMore } from '@/components/app/user-albums/useAlbumLoadMore.ts';
import { workspaceTheme } from '@/components/app/global/WorkspacePage/workspaceStyles.ts';
import { PortalThemeProvider } from '@/components/ui/portal-theme';
import { Button } from '@/components/ui/button.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { cn } from '@/lib/utils.ts';
import { CreateTournamentReportButton } from './CreateTournamentReportButton.tsx';
import { CreateTournamentAlbumButton } from './CreateTournamentAlbumButton.tsx';
import { TournamentAlbumCard } from './TournamentAlbumCard.tsx';
import { TournamentAlbumDialog } from './TournamentAlbumDialog.tsx';

export function TournamentCommunityContent({ tournamentId }: { tournamentId: string }) {
  const query = useGetTournament(tournamentId);
  const tournament = query.data?.tournament;
  if (!tournament) {
    return query.isError ? (
      <div role="alert" className="space-y-3 rounded-xl border p-5">
        <p>Could not load this tournament.</p>
        <Button variant="outline" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </div>
    ) : (
      <p role="status">Loading tournament…</p>
    );
  }
  return (
    <PortalThemeProvider value={workspaceTheme}>
      <div className={cn(workspaceTheme, creatorTheme, albumTheme, 'min-w-0 space-y-8 py-4')}>
        <Helmet title="Community content" />
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="grid min-w-0 gap-2">
            <h2 className={creatorHeading}>From the community</h2>
            <p className={creatorDescription}>
              Tournament stories, photos, videos, and more. Explore the event through the people who
              were there.
            </p>
          </div>
          <div className="w-full sm:w-auto">
            <CreateTournamentReportButton tournament={tournament} />
          </div>
        </header>
        <TournamentPublications tournamentId={tournamentId} />
        <CommunityAlbums tournamentId={tournamentId} tournamentName={tournament.name} />
      </div>
    </PortalThemeProvider>
  );
}

function ContentSkeletons() {
  return (
    <div role="status" className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
      <span className="sr-only">Loading community content…</span>
      {[0, 1, 2].map(key => (
        <Skeleton key={key} className="h-72 rounded-[20px]" />
      ))}
    </div>
  );
}

function TournamentPublications({ tournamentId }: { tournamentId: string }) {
  const section = useRef<HTMLElement>(null);
  const query = useCreatorFeed({ entityType: 'tournament', entityId: tournamentId }, true);
  const items = query.data?.pages.flatMap(page => page.items) ?? [];
  const { containerRef, loadMore } = useAlbumLoadMore(
    items.length,
    query.isFetching,
    query.fetchNextPage,
    'article > a',
  );
  return (
    <section
      ref={section}
      tabIndex={-1}
      aria-label="Articles, videos and more"
      className="space-y-4 outline-none"
    >
      {query.isPending && <ContentSkeletons />}
      {query.isError && (
        <div role="alert" className="space-y-3 rounded-xl border p-5">
          <p>Could not load {items.length ? 'more ' : ''}community publications.</p>
          <Button
            variant="outline"
            disabled={query.isFetching}
            onClick={() => {
              section.current?.focus({ preventScroll: true });
              void (query.isFetchNextPageError ? loadMore() : query.refetch());
            }}
          >
            Retry publications
          </Button>
        </div>
      )}
      {query.isSuccess && !items.length && (
        <div className={cn(creatorEmpty, 'grid justify-items-center gap-3')}>
          <BookOpen className="size-8 text-[var(--creator-accent)]" aria-hidden="true" />
          <h3 className={creatorHeading}>The first story could be yours</h3>
          <p className={creatorDescription}>
            No articles, videos, or other publications have been shared for this event yet.
          </p>
        </div>
      )}
      {!!items.length && (
        <div ref={containerRef}>
          <CreationCards items={items} />
        </div>
      )}
      {query.hasNextPage && !query.isError && (
        <div className="flex justify-center">
          <Button variant="outline" disabled={query.isFetching} onClick={() => void loadMore()}>
            {query.isFetchingNextPage ? 'Loading publications…' : 'Load more publications'}
          </Button>
        </div>
      )}
    </section>
  );
}

function CommunityAlbums({
  tournamentId,
  tournamentName,
}: {
  tournamentId: string;
  tournamentName: string;
}) {
  const section = useRef<HTMLElement>(null);
  const query = useTournamentAlbums(tournamentId);
  const albums = albumAccessLost(query.error)
    ? []
    : (query.data?.pages.flatMap(page => page.albums) ?? []);
  const [openAlbum, setOpenAlbum] = useState<string | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const { containerRef, loadMore } = useAlbumLoadMore(
    albums.length,
    query.isFetching,
    query.fetchNextPage,
    '[data-event-album]',
  );
  return (
    <section
      ref={section}
      tabIndex={-1}
      data-album-moderation-focus
      aria-label="Community photo albums"
      className="space-y-4 border-t pt-6 outline-none"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={creatorHeading}>Photo albums</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/tournaments/$tournamentId/photos"
            params={{ tournamentId }}
            aria-label="View all event albums"
            className={cn(creatorLink, 'inline-flex items-center gap-1')}
          >
            Browse photos <ArrowUpRight className="size-3" aria-hidden="true" />
          </Link>
          <CreateTournamentAlbumButton
            tournamentId={tournamentId}
            tournamentName={tournamentName}
            appearance="primary"
            label="Add your album"
            className="w-auto"
          />
        </div>
      </header>
      {query.isPending && <ContentSkeletons />}
      {query.isError && (
        <div role="alert" className="space-y-3 rounded-xl border p-5">
          <p>Could not load {albums.length ? 'more ' : ''}photo albums.</p>
          <Button
            variant="outline"
            disabled={query.isFetching}
            onClick={() => {
              section.current?.focus({ preventScroll: true });
              void (query.isFetchNextPageError ? loadMore() : query.refetch());
            }}
          >
            Retry albums
          </Button>
        </div>
      )}
      {query.isSuccess && !albums.length && (
        <div className={cn(creatorEmpty, 'grid justify-items-center gap-3')}>
          <Images className="size-8 text-[var(--album-accent)]" aria-hidden="true" />
          <h3 className={creatorHeading}>Share a moment from the event</h3>
          <p className={creatorDescription}>
            Create the first album with your photos from the tables and beyond.
          </p>
        </div>
      )}
      {!!albums.length && (
        <div ref={containerRef} className="grid items-start gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {albums.map(album => (
            <TournamentAlbumCard
              key={album.id}
              album={album}
              onSelect={button => {
                opener.current = button;
                setOpenAlbum(album.id);
              }}
            />
          ))}
        </div>
      )}
      {query.hasNextPage && !query.isError && (
        <div className="flex justify-center">
          <Button variant="outline" disabled={query.isFetching} onClick={() => void loadMore()}>
            {query.isFetchingNextPage ? 'Loading albums…' : 'Load more albums'}
          </Button>
        </div>
      )}
      {openAlbum && albums.some(album => album.id === openAlbum) && (
        <TournamentAlbumDialog
          tournamentId={tournamentId}
          tournamentName={tournamentName}
          initialAlbumId={openAlbum}
          onClose={() => setOpenAlbum(null)}
          opener={opener}
        />
      )}
    </section>
  );
}
