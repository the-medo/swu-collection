import { createFileRoute, notFound } from '@tanstack/react-router';
import { CreatorPage } from '@/components/app/creators/CreatorPage.tsx';
import { creatorTabSchema } from '@/components/app/creators/creatorPageSearch.ts';
export const Route = createFileRoute('/creators/$slug/$tab')({
  beforeLoad: ({ params }) => {
    if (!creatorTabSchema.safeParse(params.tab).success) throw notFound();
  },
  component: Page,
});
function Page() {
  const search = Route.useSearch(),
    navigate = Route.useNavigate(),
    params = Route.useParams();
  return (
    <CreatorPage
      slug={params.slug}
      tab={creatorTabSchema.parse(params.tab)}
      search={search}
      onChange={patch => {
        void navigate({ search: previous => ({ ...previous, ...patch }), resetScroll: false });
      }}
    />
  );
}
