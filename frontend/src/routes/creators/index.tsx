import { createFileRoute } from '@tanstack/react-router';
import { CreatorDirectory } from '@/components/app/creators/CreatorPages.tsx';
import { creatorDirectorySearchSchema } from '@/components/app/creators/creatorNavigationSearch.ts';
export const Route = createFileRoute('/creators/')({
  validateSearch: creatorDirectorySearchSchema,
  component: Page,
});
function Page() {
  const search = Route.useSearch(),
    navigate = Route.useNavigate();
  return (
    <CreatorDirectory
      search={search}
      onChange={patch => {
        void navigate({
          search: previous => ({ ...previous, ...patch }),
          resetScroll: false,
        });
      }}
    />
  );
}
