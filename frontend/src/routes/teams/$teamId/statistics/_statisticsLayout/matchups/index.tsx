import { createFileRoute } from '@tanstack/react-router';
import StatisticsMatchups from '@/components/app/statistics/StatisticsMatchups/StatisticsMatchups';
import { useTeam } from '@/api/teams';
import Error404 from '@/components/app/pages/error/Error404';
import { ErrorWithStatus } from '../../../../../../../../types/ErrorWithStatus.ts';

export const Route = createFileRoute('/teams/$teamId/statistics/_statisticsLayout/matchups/')({
  component: TeamStatisticsMatchupsPage,
  head: () => ({
    meta: [
      {
        title: 'Team Matchups | SWUBase',
      },
    ],
  }),
});

function TeamStatisticsMatchupsPage() {
  const { teamId } = Route.useParams();
  const { data: team, isLoading, error } = useTeam(teamId);

  if (error && (error as ErrorWithStatus).status === 404) {
    return (
      <Error404
        title="Team not found"
        description="The team you are looking for does not exist or you don't have the rights to see it."
      />
    );
  }

  if (isLoading || !team) {
    return null;
  }

  return <StatisticsMatchups teamId={team.id} />;
}
