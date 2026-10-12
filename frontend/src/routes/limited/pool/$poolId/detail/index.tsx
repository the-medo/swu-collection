import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import CardPoolDetail from '@/components/app/limited/CardPoolDetail/CardPoolDetail.tsx';
import { Visibility } from '../../../../../../../shared/types/visibility.ts';

export const Route = createFileRoute('/limited/pool/$poolId/detail/')({
  component: RouteComponent,
  validateSearch: z.object({
    poolDeckVisibility: z.enum(Visibility).optional().catch(undefined),
  }),
});

function RouteComponent() {
  const { poolId } = Route.useParams();
  const { poolDeckVisibility } = Route.useSearch();
  return <CardPoolDetail poolId={poolId} initialDeckVisibility={poolDeckVisibility} />;
}
