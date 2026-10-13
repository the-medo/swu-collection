import { createFileRoute } from '@tanstack/react-router';
import { CreatorPage } from '@/components/app/creators/CreatorPages.tsx';
export const Route = createFileRoute('/creators/$slug')({ component: Page });
function Page() {
  return <CreatorPage slug={Route.useParams().slug} />;
}
