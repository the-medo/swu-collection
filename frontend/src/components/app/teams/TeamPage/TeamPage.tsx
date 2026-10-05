import * as React from 'react';
import { useTeam } from '@/api/teams';
import { Helmet } from 'react-helmet-async';
import Error404 from '@/components/app/pages/error/Error404.tsx';
import { Outlet, useMatchRoute } from '@tanstack/react-router';
import { TeamNavigation } from './TeamNavigation.tsx';
import TeamNonMemberView from './TeamNonMemberView.tsx';
import { TeamProfileLayout, TeamProfileSkeleton } from './TeamProfileLayout.tsx';
import { TeamSidebar } from './TeamSidebar.tsx';
import type { ErrorWithStatus } from '../../../../../../types/ErrorWithStatus.ts';

interface TeamPageProps {
  idOrShortcut: string;
}

const TeamPage: React.FC<TeamPageProps> = ({ idOrShortcut }) => {
  const { data: team, isLoading, error } = useTeam(idOrShortcut);
  const matchRoute = useMatchRoute();
  const isStatistics = !!matchRoute({ to: '/teams/$teamId/statistics', fuzzy: true });

  const notFound = (error as ErrorWithStatus | null)?.status === 404;
  if (error && (notFound || !team)) {
    return (
      <div className="p-4">
        <Helmet title={`${notFound ? 'Team not found' : 'Unable to load team'} | SWUBase`} />
        <Error404
          title={notFound ? 'Team not found' : 'Unable to load team'}
          description={
            notFound
              ? "The team you are looking for does not exist or you don't have the rights to see it."
              : 'Something went wrong while loading this team. Please try refreshing the page.'
          }
        />
      </div>
    );
  }

  if (isLoading || !team) {
    return (
      <>
        <Helmet title="Loading team | SWUBase" />
        <TeamProfileSkeleton />
      </>
    );
  }

  return (
    <>
      <Helmet title={`${team.name}${isStatistics ? ' · Statistics' : ''} | SWUBase`} />
      {team.membership ? (
        <TeamProfileLayout
          team={team}
          sidebar={
            <TeamNavigation
              key={team.id}
              team={team}
              isOwner={team.membership.role === 'owner'}
              isStatistics={isStatistics}
            />
          }
        >
          <Outlet />
        </TeamProfileLayout>
      ) : (
        <TeamProfileLayout team={team} sidebar={<TeamSidebar key={team.id} team={team} />}>
          <TeamNonMemberView key={team.id} team={team} />
        </TeamProfileLayout>
      )}
    </>
  );
};

export default TeamPage;
