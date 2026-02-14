import * as React from 'react';
import { useTeam } from '@/api/teams';
import { Helmet } from 'react-helmet-async';
import Error404 from '@/components/app/pages/error/Error404.tsx';
import LoadingTitle from '@/components/app/global/LoadingTitle.tsx';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import TeamMemberView from './TeamMemberView.tsx';
import TeamNonMemberView from './TeamNonMemberView.tsx';
import type { ErrorWithStatus } from '../../../../../../types/ErrorWithStatus.ts';

interface TeamPageProps {
  idOrShortcut: string;
}

const TeamPage: React.FC<TeamPageProps> = ({ idOrShortcut }) => {
  const { data: team, isLoading, error } = useTeam(idOrShortcut);

  if (error && (error as ErrorWithStatus).status === 404) {
    return (
      <>
        <Helmet title="Team not found | SWUBase" />
        <Error404
          title="Team not found"
          description="The team you are looking for does not exist or has been deleted."
        />
      </>
    );
  }

  if (isLoading || !team) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Helmet title="Loading team | SWUBase" />
        <LoadingTitle loading />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  const isMember = !!team.membership;
  const isOwner = team.membership?.role === 'owner';

  return (
    <>
      <Helmet title={`${team.name} | SWUBase`} />
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-4">
          {team.logoUrl && (
            <img
              src={team.logoUrl}
              alt={`${team.name} logo`}
              className="w-16 h-16 rounded-lg object-cover"
            />
          )}
          <LoadingTitle mainTitle={team.name} subTitle={team.description} />
        </div>
        {isMember ? (
          <TeamMemberView team={team} isOwner={isOwner} />
        ) : (
          <TeamNonMemberView team={team} />
        )}
      </div>
    </>
  );
};

export default TeamPage;
