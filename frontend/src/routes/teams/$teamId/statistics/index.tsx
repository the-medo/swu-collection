import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/teams/$teamId/statistics/')({
  component: TeamStatisticsPage,
  beforeLoad: ({ params }) => {
    throw redirect({ to: `/teams/${params.teamId}/statistics/dashboard` });
  },
});

function TeamStatisticsPage() {
  return null;
}
