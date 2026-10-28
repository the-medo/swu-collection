import { useRef, useState } from 'react';
import { TournamentAlbumDialog } from './TournamentAlbumDialog.tsx';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight, Images } from 'lucide-react';
import { useTournamentAlbums } from '@/api/user-albums/useTournamentAlbums.ts';
import { albumAccessLost } from '@/api/user-albums/client.ts';
import { Button } from '@/components/ui/button.tsx';
import { albumTheme } from '@/components/app/user-albums/albumStyles.ts';
import { CreateTournamentAlbumButton } from './CreateTournamentAlbumButton.tsx';
import { TournamentAlbumCard } from './TournamentAlbumCard.tsx';
import { TournamentPhotoArt } from './TournamentCommunityArt.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { workspaceStyles } from '@/components/app/global/WorkspacePage/workspaceStyles.ts';
import { cn } from '@/lib/utils.ts';

export function TournamentAlbums({
  tournamentId,
  tournamentName,
}: {
  tournamentId: string;
  tournamentName: string;
}) {
  const [openAlbum, setOpenAlbum] = useState<string | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const query = useTournamentAlbums(tournamentId);
  const albums = albumAccessLost(query.error)
    ? []
    : (query.data?.pages.flatMap(page => page.albums).slice(0, 4) ?? []);
  return (
    <section
      aria-label="Event photos"
      className={cn(
        albumTheme,
        workspaceStyles.panel,
        'flex min-w-0 flex-col overflow-hidden bg-linear-to-b from-primary/5 to-card p-4',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className={cn(workspaceStyles.heading, 'flex items-center gap-2')}>
          <Images className="size-4 text-primary" aria-hidden="true" /> Event photos
        </h2>
        <Link
          to="/tournaments/$tournamentId/photos"
          params={{ tournamentId }}
          aria-label="View all event albums"
          className="flex shrink-0 items-center gap-1 rounded-sm text-[11px] font-medium text-[var(--album-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          View all <ArrowUpRight className="size-3" />
        </Link>
      </div>
      {query.isPending && (
        <div role="status" className="my-4 grid flex-1 grid-cols-2 gap-2">
          <span className="sr-only">Loading albums…</span>
          <Skeleton className="min-h-32 rounded-lg" />
          <Skeleton className="min-h-32 rounded-lg" />
        </div>
      )}
      {query.isError && (
        <div role="alert" className="my-5 flex-1 space-y-2 text-xs">
          <p className="text-destructive">{query.error.message}</p>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => void query.refetch()}
          >
            Retry event photos
          </Button>
        </div>
      )}
      {query.isSuccess && !albums.length && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-5 text-center">
          <TournamentPhotoArt />
          <div className="space-y-2">
            <h3 className={cn(workspaceStyles.heading, 'text-[length:1rem]!')}>
              A tournament worth remembering
            </h3>
            <p className="mx-auto max-w-64 text-xs leading-relaxed! text-muted-foreground">
              The tables, the people, the moments between rounds. Share the first photos from this
              event.
            </p>
          </div>
        </div>
      )}
      {!!albums.length && (
        <div className="my-4 grid grid-cols-2 gap-2">
          {albums.map(album => (
            <TournamentAlbumCard
              key={album.id}
              album={album}
              compact
              onSelect={button => {
                opener.current = button;
                setOpenAlbum(album.id);
              }}
            />
          ))}
        </div>
      )}
      <div className="mt-auto pt-2">
        <CreateTournamentAlbumButton
          tournamentId={tournamentId}
          tournamentName={tournamentName}
          label={albums.length ? 'Add your album' : 'Share your photos'}
          className="w-full"
        />
      </div>
      {openAlbum && (
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
