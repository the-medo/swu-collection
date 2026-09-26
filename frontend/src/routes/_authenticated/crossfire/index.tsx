import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { CrossfireHome } from '@/components/app/crossfire/CrossfireHome.tsx';
export const Route = createFileRoute('/_authenticated/crossfire/')({
  validateSearch: z.object({
    cfOpponent: z.enum(['human', 'ai']).optional().catch(undefined),
    cfDeck: z.uuid().optional().catch(undefined),
    cfInvite: z.uuid().optional().catch(undefined),
  }),
  component: Page,
});
function Page() {
  return (
    <CrossfireHome
      initialDeck={Route.useSearch().cfDeck}
      invitationId={Route.useSearch().cfInvite}
    />
  );
}
