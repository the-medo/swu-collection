import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/statistics/')({
  component: StatisticsPage,
  beforeLoad: () => {
    throw redirect({ to: '/statistics/dashboard' });
  },
});

function StatisticsPage() {
  // This component will not be rendered because of the redirect in beforeLoad
  return null;
}
