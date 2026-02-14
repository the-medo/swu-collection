import { createFileRoute } from '@tanstack/react-router';
import TeamsPage from '@/components/app/teams/TeamsPage/TeamsPage.tsx';

export const Route = createFileRoute('/teams/')({
  component: RouteComponent,
});

function RouteComponent() {
  return <TeamsPage />;
}
