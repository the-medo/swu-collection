import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useSession } from '@/lib/auth-client.ts';

const AuthorizedRouteComponent = () => {
  const session = useSession();

  if (session.isPending) {
    return <div>Loading...</div>;
  }

  if (session.data) {
    return <Outlet />;
  }

  return <div>You must be logged in to view this page.</div>;
};

export const Route = createFileRoute('/_authenticated')({
  component: AuthorizedRouteComponent,
});
