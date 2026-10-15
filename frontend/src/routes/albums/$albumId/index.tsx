import { createFileRoute } from '@tanstack/react-router';
import { AlbumPage } from '@/components/app/user-albums/AlbumPage.tsx';

export const Route = createFileRoute('/albums/$albumId/')({ component: AlbumRoute });
function AlbumRoute() {
  const { albumId } = Route.useParams();
  return <AlbumPage key={albumId} id={albumId} />;
}
