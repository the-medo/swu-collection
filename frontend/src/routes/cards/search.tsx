import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import AdvancedCardSearch from '@/components/app/cards/AdvancedCardSearch/AdvancedCardSearch.tsx';
import { cardSearchParams } from '@/components/app/cards/AdvancedCardSearch/advancedSearchLib.ts';

const searchParams = cardSearchParams;

export type ZAdvancedSearchParams = z.infer<typeof searchParams>;

export const Route = createFileRoute('/cards/search')({
  component: RouteComponent,
  validateSearch: searchParams,
});

function RouteComponent() {
  return <AdvancedCardSearch />;
}
