import { createFileRoute } from '@tanstack/react-router';
import TeamPage from '@/components/app/teams/TeamPage/TeamPage.tsx';
import { z } from 'zod';

export const Route = createFileRoute('/teams/$teamId/')({
  component: RouteComponent,
  validateSearch: z.object({
    teamTab: z.enum(['decks', 'members', 'events', 'settings']).optional(),
  }),
});

function RouteComponent() {
  const { teamId } = Route.useParams();

  return <TeamPage idOrShortcut={teamId} />;
}
