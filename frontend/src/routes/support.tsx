import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { SupportPage } from '@/components/app/support/SupportPage';

export const Route = createFileRoute('/support')({
  validateSearch: z.object({
    supportCheckout: z.enum(['success', 'cancelled']).optional().catch(undefined),
    supportRequest: z.uuid().optional().catch(undefined),
  }),
  component: SupportRoute,
});
function SupportRoute() {
  return <SupportPage {...Route.useSearch()} />;
}
