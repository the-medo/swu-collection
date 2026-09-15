import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { CrossfireLobbyPage } from '@/components/app/crossfire/CrossfireLobbyPage.tsx';
export const Route = createFileRoute('/_authenticated/crossfire/$lobbyId')({ component: Page });
function Page() {
  const { lobbyId } = Route.useParams();
  return z.uuid().safeParse(lobbyId).success ? (
    <CrossfireLobbyPage lobbyId={lobbyId} />
  ) : (
    <p role="alert" className="p-8">
      This invitation link is invalid.
    </p>
  );
}
