import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/teams/$teamId/statistics/')({
  component: TeamStatisticsPage,
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/teams/$teamId/statistics/dashboard',
      params,
      search: previous => ({ ...previous, teamTab: undefined }),
      replace: true,
    });
  },
});

function TeamStatisticsPage() {
  return null;
}
