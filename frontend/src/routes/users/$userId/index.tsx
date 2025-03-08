import { createFileRoute } from '@tanstack/react-router';
import UserDetail from '@/components/app/users/UserDetail/UserDetail.tsx';

export const Route = createFileRoute('/users/$userId/')({
  component: RouteComponent,
});

function RouteComponent() {
  return <UserDetail />;
}
