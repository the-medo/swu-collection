import { createFileRoute, useRouter } from '@tanstack/react-router';
import ArtistShowcase from '@/components/app/artists/ArtistShowcase.tsx';
import { artistGallerySearchSchema } from '@/components/app/artists/artistGallery.ts';

declare module '@tanstack/history' {
  interface HistoryState {
    artistViewerGallery?: string;
  }
}

export const Route = createFileRoute('/artists/$artistKey')({
  component: ArtistPage,
  validateSearch: artistGallerySearchSchema,
  // This router version decodes ? and # during path interpolation. Keep a layer of
  // encoding around artist credits until route matching has finished.
  params: {
    parse: ({ artistKey }) => {
      try {
        return { artistKey: decodeURIComponent(artistKey) };
      } catch {
        return { artistKey };
      }
    },
    stringify: ({ artistKey }) => ({
      artistKey: artistKey.replace(/[%?#]/g, character => encodeURIComponent(character)),
    }),
  },
});

function ArtistPage() {
  const { artistKey } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const router = useRouter();
  const galleryKey = JSON.stringify([
    search.artistSearch,
    search.artistSet,
    search.artistTreatment,
  ]);
  return (
    <ArtistShowcase
      key={artistKey}
      artistKey={artistKey}
      search={search}
      onSearchChange={(patch, replace = false) => {
        const openingViewer = !search.artistArtwork && !!patch.artistArtwork && !replace;
        const nextSearch = { ...search, ...patch };
        void navigate({
          search: previous => ({ ...previous, ...patch }),
          state: previous => ({
            ...previous,
            artistViewerGallery: openingViewer
              ? galleryKey
              : nextSearch.artistArtwork
                ? previous.artistViewerGallery
                : undefined,
          }),
          replace,
          resetScroll: false,
        });
      }}
      onCloseViewer={() => {
        // Keep Back/Forward meaningful after closing. History state survives a
        // refresh; a shared viewer URL without this marker closes in place.
        // Reading on close avoids subscribing to intermediate redirect locations.
        const state = router.state.location.state;
        if (state.artistViewerGallery === galleryKey && state.__TSR_index > 0) {
          router.history.back();
        } else {
          void navigate({
            search: previous => ({ ...previous, artistArtwork: undefined }),
            state: previous => ({ ...previous, artistViewerGallery: undefined }),
            replace: true,
            resetScroll: false,
          });
        }
      }}
    />
  );
}
