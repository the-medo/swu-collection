import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import TeamPage from '@/components/app/teams/TeamPage/TeamPage.tsx';

export const Route = createFileRoute('/teams/$teamId')({
  component: RouteComponent,
  validateSearch: z.object({
    teamTab: z.enum(['decks', 'members', 'events', 'settings']).optional(),
  }),
});

function RouteComponent() {
  const { teamId } = Route.useParams();
  return <TeamPage idOrShortcut={teamId} />;
}
