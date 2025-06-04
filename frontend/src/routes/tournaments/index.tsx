import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/tournaments/')({
  component: TournamentsPage,
  beforeLoad: () => {
    throw redirect({ to: '/tournaments/featured' });
  },
});

function TournamentsPage() {
  // This component will not be rendered because of the redirect in beforeLoad
  return null;
}
