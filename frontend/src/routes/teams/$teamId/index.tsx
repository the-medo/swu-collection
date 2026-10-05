import { createFileRoute } from '@tanstack/react-router';
import { useTeam } from '@/api/teams';
import TeamMemberView from '@/components/app/teams/TeamPage/TeamMemberView.tsx';

export const Route = createFileRoute('/teams/$teamId/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { teamId } = Route.useParams();
  const { data: team } = useTeam(teamId);
  if (!team?.membership) return null;
  return <TeamMemberView key={team.id} team={team} isOwner={team.membership.role === 'owner'} />;
}
