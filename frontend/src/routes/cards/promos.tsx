import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import PromosPage from '@/components/app/cards/CardHome/PromosPage.tsx';

export const Route = createFileRoute('/cards/promos')({
  validateSearch: z.object({ promoGroup: z.uuid().optional().catch(undefined) }),
  component: PromosRoute,
});

function PromosRoute() {
  const { promoGroup } = Route.useSearch();
  return <PromosPage selectedGroupId={promoGroup} />;
}
