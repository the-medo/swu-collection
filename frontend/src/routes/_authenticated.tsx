import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useSession } from '@/lib/auth-client.ts';
import * as React from 'react';
import { PropsWithChildren } from 'react';

interface AuthorizedRouteComponentProps extends PropsWithChildren {}

export const AuthorizedRouteComponent: React.FC<AuthorizedRouteComponentProps> = ({ children }) => {
  const session = useSession();

  if (session.isPending) {
    return <div>Loading...</div>;
  }

  if (session.data) {
    return (
      <>
        {children}
        <Outlet />
      </>
    );
  }

  return <div>You must be logged in to view this page.</div>;
};

export const Route = createFileRoute('/_authenticated')({
  component: AuthorizedRouteComponent,
});
