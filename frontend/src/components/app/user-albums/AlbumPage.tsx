import { Link } from '@tanstack/react-router';
import { useUser } from '@/hooks/useUser.ts';
import { useUserAlbum } from '@/api/user-albums/useUserAlbum.ts';
import { albumAccessLost } from '@/api/user-albums/client.ts';
import { Button } from '@/components/ui/button.tsx';
import { AlbumGrid } from './AlbumGrid.tsx';
import { AlbumShare } from './AlbumShare.tsx';
import { AlbumPrivacyControl } from './AlbumPrivacyControl.tsx';
import { AlbumHeader } from './AlbumHeader.tsx';
import { albumTheme } from './albumStyles.ts';
import { Settings2 } from 'lucide-react';

export function AlbumPage({ id }: { id: string }) {
  const viewer = useUser();
  const query = useUserAlbum(id);
  const data = query.data?.pages[0];
  if (query.isPending)
    return (
      <div className="p-6">
        <title>Album | SWUBase</title>
        <meta name="robots" content="noindex, nofollow" />
        <p role="status">Loading album…</p>
      </div>
    );
  if (!data || albumAccessLost(query.error))
    return (
      <div className="space-y-3 p-6" role="alert">
        <title>Album | SWUBase</title>
        <meta name="robots" content="noindex, nofollow" />
        <p>{query.error?.message ?? 'Album not found.'}</p>
        <Button onClick={() => void query.refetch()}>Try again</Button>
      </div>
    );
  const images = query.data!.pages.flatMap(page => page.images);
  return (
    <main className={`${albumTheme} mx-auto w-full max-w-7xl space-y-8 p-4 pb-10 sm:p-6`}>
      {/* Native document metadata survives React 19 Strict Mode remounts. */}
      <title>{`${data.album.title} | SWUBase`}</title>
      {data.album.visibility !== 'public' && <meta name="robots" content="noindex, nofollow" />}
      <AlbumHeader
        heading="h1"
        eyebrow="Album"
        title={data.album.title}
        description={data.album.description}
        cover={data.album.cover?.thumbnailUrl}
        titleAction={data.album.visibility !== 'private' ? <AlbumShare id={id} /> : undefined}
        metadata={
          <>
            <span>
              By{' '}
              <Link
                className="font-medium text-[#dce7a0] underline-offset-4 hover:underline"
                to="/users/$userId"
                params={{ userId: data.owner.id }}
                search={{ userTab: 'albums' }}
              >
                {data.owner.displayName}
              </Link>
            </span>
            <span>
              · {data.album.imageCount} images
              {viewer?.id === data.album.userId ? ` · ${data.album.visibility}` : ''}
            </span>
            {data.album.tournament && (
              <Link
                className="basis-full font-medium text-[#dce7a0] underline-offset-4 hover:underline"
                to="/tournaments/$tournamentId/details"
                params={{ tournamentId: data.album.tournament.id }}
              >
                {data.album.tournament.name}
              </Link>
            )}
          </>
        }
        actions={
          viewer?.id === data.album.userId ? (
            <>
              <div className="mr-auto basis-full pb-3">
                <AlbumPrivacyControl album={data.album} disabled={query.isFetching} hero />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-lg border border-white/20 text-[#fffaf0] hover:bg-white/10 hover:text-white"
                asChild
              >
                <Link to="/settings" search={{ page: 'uploads', uploadView: 'albums', album: id }}>
                  <Settings2 /> Manage album
                </Link>
              </Button>
            </>
          ) : undefined
        }
      />
      {query.isError && (
        <div role="alert">
          <p>{query.error.message}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Reload album
          </Button>
        </div>
      )}
      <AlbumGrid
        title={data.album.title}
        images={images}
        hasMore={query.hasNextPage}
        loading={query.isFetching}
        onLoadMore={() => query.fetchNextPage()}
      />
    </main>
  );
}
