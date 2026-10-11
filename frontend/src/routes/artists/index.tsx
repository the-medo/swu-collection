import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import ArtistDirectory from '@/components/app/artists/ArtistDirectory.tsx';
import { artistDirectorySearchSchema } from '@/components/app/artists/artistDirectoryHelpers.ts';

export const Route = createFileRoute('/artists/')({
  component: ArtistDirectoryPage,
  validateSearch: artistDirectorySearchSchema,
  search: { middlewares: [stripSearchParams({ artistSort: 'name' })] },
});

function ArtistDirectoryPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <ArtistDirectory
      search={search}
      onSearchChange={(patch, replace = false) => {
        void navigate({
          search: previous => {
            const next = { ...previous, ...patch };
            return {
              ...next,
              artistSort: next.artistSort === 'name' ? undefined : next.artistSort,
            };
          },
          replace,
          resetScroll: false,
        });
      }}
    />
  );
}
