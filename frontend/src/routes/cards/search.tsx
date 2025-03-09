import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-adapter';
import AdvancedCardSearch from '@/components/app/cards/AdvancedCardSearch/AdvancedCardSearch.tsx';

const searchParams = z.object({
  q: z.string().optional(),
});

export const Route = createFileRoute('/cards/search')({
  component: RouteComponent,
  validateSearch: zodValidator(searchParams),
});

function RouteComponent() {
  return <AdvancedCardSearch />;
}
