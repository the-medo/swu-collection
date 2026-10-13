import { createFileRoute } from '@tanstack/react-router';
import CreationPage from '@/components/app/creators/CreationPage.tsx';
export const Route = createFileRoute('/content/$creationId')({ component: Page });
function Page() {
  return <CreationPage id={Route.useParams().creationId} />;
}
