import { createFileRoute } from '@tanstack/react-router';
import TeamPage from '@/components/app/teams/TeamPage/TeamPage.tsx';

export const Route = createFileRoute('/teams/$teamId/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { teamId } = Route.useParams();

  return <TeamPage idOrShortcut={teamId} />;
}
