import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useSession } from '@/lib/auth-client.ts';
import * as React from 'react';
import { PropsWithChildren } from 'react';
import SignIn from '@/components/app/auth/SignIn.tsx';

interface AuthorizedRouteComponentProps extends PropsWithChildren {
  title?: string;
}

export const AuthorizedRouteComponent: React.FC<AuthorizedRouteComponentProps> = ({
  children,
  title,
}) => {
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

  return (
    <>
      {title ? <h3 className="m-2">{title}</h3> : null}
      <div className="w-full min-h-[30vh] flex flex-col items-center justify-center gap-4">
        <div>You must be logged in to view this page.</div>
        <SignIn isLeftSidebar={false} />
      </div>
    </>
  );
};

export const Route = createFileRoute('/_authenticated')({
  component: AuthorizedRouteComponent,
});
