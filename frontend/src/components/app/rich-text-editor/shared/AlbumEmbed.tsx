import { useUserAlbum } from '@/api/user-albums/useUserAlbum.ts';
import { albumAccessLost } from '@/api/user-albums/client.ts';
import { Button } from '@/components/ui/button.tsx';
import { AlbumPreview } from './AlbumPreview.tsx';
import { PickerNotice } from './PickerLayout.tsx';

export function AlbumEmbed({ albumId }: { albumId: string }) {
  const query = useUserAlbum(albumId);
  if (query.isPending) return <PickerNotice loading title="Loading album…" />;
  // Do not display cached photos after access is revoked or a request fails.
  if (query.isError) {
    const unavailable = albumAccessLost(query.error);
    return (
      <PickerNotice error title={unavailable ? 'Album unavailable' : 'Could not load album'}>
        <p>
          {unavailable
            ? 'This album is private or no longer available.'
            : 'Please try loading the album again.'}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Try again
        </Button>
      </PickerNotice>
    );
  }
  return <AlbumPreview data={query.data.pages[0]} />;
}
