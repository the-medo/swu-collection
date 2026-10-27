import { z } from 'zod';
import { createFileRoute } from '@tanstack/react-router';
import DiscoveryPage from '@/components/app/creators/DiscoveryPage.tsx';
import { discoverySchema } from '../../../../shared/creators/contracts.ts';
export const Route = createFileRoute('/content/')({
  validateSearch: z.object({
    following: discoverySchema.shape.following.catch(undefined),
    q: discoverySchema.shape.q.catch(undefined),
    tags: discoverySchema.shape.tags.catch(undefined),
    language: discoverySchema.shape.language.catch(undefined),
    creatorId: discoverySchema.shape.creatorId.catch(undefined),
    entityType: discoverySchema.shape.entityType.catch(undefined),
    entityId: discoverySchema.shape.entityId.catch(undefined),
    freshness: discoverySchema.shape.freshness.catch(undefined),
    series: discoverySchema.shape.series.catch(undefined),
    after: discoverySchema.shape.after.catch(undefined),
    before: discoverySchema.shape.before.catch(undefined),
    page: discoverySchema.shape.page.catch(1),
  }),
  component: Page,
});
function Page() {
  const search = Route.useSearch(),
    navigate = Route.useNavigate();
  return (
    <DiscoveryPage
      search={search}
      onChange={patch => {
        void navigate({ search: previous => ({ ...previous, ...patch }), resetScroll: false });
      }}
    />
  );
}
