import { createFileRoute } from '@tanstack/react-router';
import { CreatorPage } from '@/components/app/creators/CreatorPage.tsx';
export const Route = createFileRoute('/creators/$slug/')({ component: Page });
function Page() {
  const search = Route.useSearch(),
    navigate = Route.useNavigate();
  return (
    <CreatorPage
      slug={Route.useParams().slug}
      search={search}
      onChange={patch => {
        void navigate({ search: previous => ({ ...previous, ...patch }), resetScroll: false });
      }}
    />
  );
}
