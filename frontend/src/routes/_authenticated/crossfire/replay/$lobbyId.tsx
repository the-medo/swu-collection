import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { CrossfireReplayPage } from '@/components/app/crossfire/CrossfireReplayPage.tsx';
const handle = z
  .string()
  .regex(/^[a-f0-9]{32}$/)
  .optional()
  .catch(undefined);
export const Route = createFileRoute('/_authenticated/crossfire/replay/$lobbyId')({
  validateSearch: z.object({
    cfPosition: handle,
    cfBranch: handle,
    cfPractice: z.uuid().optional().catch(undefined),
  }),
  component: Page,
});
function Page() {
  const { lobbyId } = Route.useParams(),
    { cfPosition, cfBranch, cfPractice } = Route.useSearch();
  return z.uuid().safeParse(lobbyId).success ? (
    <CrossfireReplayPage
      lobbyId={lobbyId}
      position={cfPosition}
      branch={cfBranch}
      practice={cfPractice}
    />
  ) : (
    <p role="alert" className="p-8">
      This replay link is invalid.
    </p>
  );
}
