import { createFileRoute } from '@tanstack/react-router';
import { CreatorClaimPage } from '@/components/app/creators/CreatorClaimPage.tsx';

export const Route = createFileRoute('/creators/$slug/claim')({ component: Page });

function Page() {
  return <CreatorClaimPage slug={Route.useParams().slug} />;
}
