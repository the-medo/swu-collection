import { createFileRoute } from '@tanstack/react-router';
import CreationPage from '@/components/app/creators/CreationPage.tsx';
import { z } from 'zod';
import { creatorReturnToSchema } from '@/components/app/creators/creatorNavigationSearch.ts';
export const Route = createFileRoute('/content/$creationId')({
  validateSearch: z.object({ returnTo: creatorReturnToSchema }),
  component: Page,
});
function Page() {
  return <CreationPage id={Route.useParams().creationId} returnTo={Route.useSearch().returnTo} />;
}
